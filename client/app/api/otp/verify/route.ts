/**
 * OTP Verify Route
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRateStore } from '@/lib/rateStore';
import { decrypt, isEncrypted } from '@/lib/encryption';

// Static imports with graceful fallback for serverless environments
let ImapFlowModule: any = null;
let simpleParserModule: any = null;
try {
  ImapFlowModule = require('imapflow');
  simpleParserModule = require('mailparser');
} catch {
  // imapflow/mailparser not available in this environment
}

function hashAccessKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function verifyOtpKey(row: any, accessKey: string): boolean {
  if (!row) return false;
  if (row.access_key_hash) {
    const computedHash = hashAccessKey(accessKey);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(row.access_key_hash, 'hex')
      );
    } catch {
      return false;
    }
  }
  // Legacy plaintext fallback — compare safely
  if (row.access_key) {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(row.access_key),
        Buffer.from(accessKey)
      );
    } catch {
      return false;
    }
  }
  return false;
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

function cleanCredential(text: string): string {
  const regex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\|([a-fA-F0-9]{32})(?:\|([a-zA-Z0-9]{16,64}))?/i;
  const match = text.match(regex);
  if (match) {
    const email = match[1];
    const key = match[2];
    const twofa = match[3];
    return twofa ? `${email}|${key}|${twofa}` : `${email}|${key}`;
  }
  return text.trim();
}

/**
 * POST /api/otp/verify
 */
export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();
    const cleaned = credential ? cleanCredential(credential) : '';

    if (!cleaned || !cleaned.includes('|')) {
      return NextResponse.json({ error: 'Định dạng: email|key hoặc email|key|2fa_secret' }, { status: 400 });
    }

    const parts = cleaned.split('|');
    const addressLower = (parts[0] || '').trim().toLowerCase();
    const accessKey = (parts[1] || '').trim();

    if (!addressLower || !accessKey) {
      return NextResponse.json({ error: 'Email và key không được trống' }, { status: 400 });
    }

    const rateStore = getRateStore();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Rate limiting — balanced limits for OTP endpoint
    const minuteKey = `otp:${ip}:minute`;
    const dayKey = `otp:${ip}:day`;
    const minuteCount = await rateStore.incr(minuteKey, 60);
    const dayCount = await rateStore.incr(dayKey, 86400);

    if (minuteCount > 30 || dayCount > 300) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    // Verify access key
    const { data: otpKey } = await supabaseAdmin!.from('otp_keys').select('address, access_key, access_key_hash').eq('address', addressLower).maybeSingle();

    if (!verifyOtpKey(otpKey, accessKey)) {
      return NextResponse.json({ error: 'Sai email hoặc key' }, { status: 401 });
    }

    // Check if it is a Gmail Dotmail account
    const { data: dotmail } = await supabaseAdmin!
      .from('gmail_dotmails')
      .select('parent_id, address')
      .eq('address', addressLower)
      .maybeSingle();

    if (dotmail) {
      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('address, app_password')
        .eq('id', dotmail.parent_id)
        .maybeSingle();

      if (parent) {
        // Scan via IMAP
        if (!ImapFlowModule || !simpleParserModule) {
          return NextResponse.json({ error: 'IMAP modules not available in this environment' }, { status: 503 });
        }
        const { ImapFlow } = ImapFlowModule;
        const { simpleParser } = simpleParserModule;

        const imapPassword = isEncrypted(parent.app_password) ? decrypt(parent.app_password) : parent.app_password;

        const client = new ImapFlow({
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: { user: parent.address, pass: imapPassword },
          logger: false,
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
          const status = await client.status('INBOX', { messages: true });
          const totalMessages = status.messages || 0;
          let messages = [];
          if (totalMessages > 0) {
            const startSeq = Math.max(1, totalMessages - 20 + 1);
            messages = client.fetch(
              `${startSeq}:${totalMessages}`,
              { source: true, uid: true, envelope: true }
            );
          }

          const emailsList: any[] = [];
          for await (const msg of messages) {
            try {
              const parsed = await simpleParser(msg.source);
              const emailDate = parsed.date || new Date();

              const rawSource = msg.source.toString('utf-8');
              const headerEnd = rawSource.indexOf('\r\n\r\n');
              const headersText = headerEnd !== -1 ? rawSource.substring(0, headerEnd).toLowerCase() : rawSource.toLowerCase();

              const toHeaderMatch = headersText.match(/^to:\s*([\s\S]*?)(?=\r?\n[^\s]|$)/m);
              const ccHeaderMatch = headersText.match(/^cc:\s*([\s\S]*?)(?=\r?\n[^\s]|$)/m);
              const toText = toHeaderMatch ? toHeaderMatch[1] : '';
              const ccText = ccHeaderMatch ? ccHeaderMatch[1] : '';

              const extractEmails = (text: string): string[] => {
                const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const matches = text.match(regex);
                return matches ? matches.map(m => m.toLowerCase().trim()) : [];
              };

              const targetEmail = addressLower;
              const recipientEmails = [...extractEmails(toText), ...extractEmails(ccText)];
              const isTargetDotmail = recipientEmails.includes(targetEmail);

              if (!isTargetDotmail) continue;

              const textContent = parsed.text || '';
              const htmlContent = parsed.html || '';
              const strippedHtml = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              const combinedText = `${parsed.subject || ''}\n${textContent}\n${strippedHtml}`;
              const otp = extractOTP(combinedText);

              emailsList.push({
                id: String(msg.uid || emailDate.getTime()),
                from: parsed.from?.text || '',
                subject: parsed.subject || '',
                preview: textContent.substring(0, 300).trim() || strippedHtml.substring(0, 300).trim(),
                code: otp,
                receivedAt: emailDate.toISOString(),
                date: emailDate
              });
            } catch {}
          }

          emailsList.sort((a, b) => b.date.getTime() - a.date.getTime());
          return NextResponse.json({ emails: emailsList, address: addressLower });
        } finally {
          lock.release();
          await client.logout().catch(() => {});
        }
      }
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
    console.error('[OTP] POST /verify error:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
