/**
 * OTP Verify Route
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRateStore } from '@/lib/rateStore';

function hashAccessKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function verifyOtpKey(row: any, accessKey: string): boolean {
  if (!row) return false;
  if (row.access_key_hash) {
    return row.access_key_hash === hashAccessKey(accessKey);
  }
  return row.access_key === accessKey;
}

function extractOTP(text: string | null): string | null {
  if (!text) return null;

  // 1. Decode common HTML entities
  let cleanText = text.replace(/&#8209;|&#x2011;/g, '-');
  cleanText = cleanText.replace(/&nbsp;|&#160;/g, ' ');
  cleanText = cleanText.replace(/&amp;|&#38;/g, '&');

  // 2. Clean URLs, email addresses, and markdown link formats to avoid matching random tokens inside URLs/headers
  cleanText = cleanText.replace(/https?:\/\/[^\s\]\)]+/gi, ' ');
  cleanText = cleanText.replace(/\[([^\]]*)\]\([^\)]*\)/g, ' $1 '); // convert [text](url) to text
  cleanText = cleanText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' '); // remove emails

  // 3. Normalize all unicode hyphens/dashes to standard ASCII hyphen
  cleanText = cleanText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212–—]/g, '-');

  // 4. Check for alphanumeric codes with a hyphen (e.g. F2P-6WP, CJN-I33, BWC-JRX)
  const hyphenMatch = cleanText.match(/\b([A-Z0-9]{2,5}-[A-Z0-9]{2,5})\b/i);
  if (hyphenMatch) {
    const code = hyphenMatch[1].toUpperCase();
    const exclusions = ['OPT-IN', 'OPT-OUT', 'ADD-ON', 'PRE-AMP', 'E-MAIL', 'X-AI'];
    if (code.length >= 5 && code.length <= 11 && !exclusions.includes(code)) {
      return code;
    }
  }

  // 5. Pure digits of length 6 (highest priority standard numeric OTP)
  const sixDigitMatch = cleanText.match(/\b(\d{6})\b/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }

  // 6. Pure digits of length 4 to 8 (excluding copyright years)
  const digitsMatch = cleanText.match(/\b(\d{4,8})\b/);
  if (digitsMatch) {
    const code = digitsMatch[1];
    // Exclude years (2024-2030) to avoid false positive matching with copyright year
    if (!(code.length === 4 && /^202[4-9]|2030$/.test(code))) {
      return code;
    }
  }

  // 7. Context-based alphanumeric code matching (e.g. code: A1B2, verification: 4910)
  const contextPatterns = [
    /(?:code|mã|otp|verification|xác\s*minh|confirm|security)[:\s]+([A-Z0-9-]{4,8})/i,
    /([A-Z0-9-]{4,8})[:\s]+(?:is\s+your\s+code|là\s+mã\s+xác\s+minh)/i
  ];
  for (const pattern of contextPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const code = match[1];
      if (code && code.length >= 4 && code.length <= 8 && /[0-9]/.test(code)) {
        return code.toUpperCase();
      }
    }
  }

  // 8. Alphanumeric of length 4 to 8 containing both letters and digits (e.g. A1B2C3, GROK12)
  const alphaNumMatch = cleanText.match(/\b([A-Z0-9]{4,8})\b/i);
  if (alphaNumMatch) {
    const code = alphaNumMatch[1];
    if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
      return code.toUpperCase();
    }
  }

  return null;
}

/**
 * POST /api/otp/verify
 */
export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential || !credential.includes('|')) {
      return NextResponse.json({ error: 'Định dạng: email|key hoặc email|key|2fa_secret' }, { status: 400 });
    }

    const parts = credential.split('|');
    const addressLower = (parts[0] || '').trim().toLowerCase();
    const accessKey = (parts[1] || '').trim();

    if (!addressLower || !accessKey) {
      return NextResponse.json({ error: 'Email và key không được trống' }, { status: 400 });
    }

    const rateStore = getRateStore();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Simple rate limiting
    const minuteKey = `otp:${ip}:minute`;
    const dayKey = `otp:${ip}:day`;
    const minuteCount = await rateStore.incr(minuteKey, 60);
    const dayCount = await rateStore.incr(dayKey, 86400);

    if (minuteCount > 100 || dayCount > 1000) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    // Verify access key
    const { data: otpKey } = await supabaseAdmin!.from('otp_keys').select('address, access_key, access_key_hash').eq('address', addressLower).maybeSingle();

    if (!verifyOtpKey(otpKey, accessKey)) {
      return NextResponse.json({ error: 'Sai email hoặc key' }, { status: 401 });
    }

    // Find account
    const { data: account } = await supabaseAdmin!.from('accounts').select('id').eq('address', addressLower).maybeSingle();

    if (!account) {
      return NextResponse.json({ emails: [], address: addressLower });
    }

    // Get emails
    const { data: emails } = await supabaseAdmin!.from('emails').select('id, from_address, from_name, subject, text_content, html_content, received_at').eq('account_id', account.id).eq('is_deleted', false).order('received_at', { ascending: false }).limit(20);

    const result = (emails || []).map((e: any) => {
      const content = e.text_content || e.html_content?.replace(/<[^>]*>/g, ' ') || '';
      return {
        id: e.id,
        from: e.from_name || e.from_address,
        subject: e.subject,
        preview: content.substring(0, 300).trim(),
        code: extractOTP(content),
        receivedAt: e.received_at,
      };
    });

    return NextResponse.json({ emails: result, address: addressLower });
  } catch (err) {
    console.error('[OTP] POST /verify error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
