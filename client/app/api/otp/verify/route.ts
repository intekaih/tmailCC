/**
 * OTP Verify Route
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRateStore } from '@/lib/rateStore';
import { decrypt, isEncrypted } from '@/lib/encryption';
import { extractOtp } from '@/lib/services/otpUtils';

// Static imports with graceful fallback for serverless environments
let ImapFlowModule: any = null;
let simpleParserModule: any = null;
try {
  ImapFlowModule = require('imapflow');
  simpleParserModule = require('mailparser');
} catch {
  // imapflow/mailparser not available in this environment
}

function normalizeDotmail(email: string): string {
  const [local, domain] = email.toLowerCase().split('@');
  if (!domain) return email;
  return `${local.replace(/\./g, '')}@${domain}`;
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
              const cleanParent = parent.address.toLowerCase().trim();
              const recipientEmails = [...extractEmails(toText), ...extractEmails(ccText)];

              let isTargetDotmail = false;
              if (targetEmail === cleanParent) {
                const normalizedTarget = normalizeDotmail(targetEmail);
                isTargetDotmail = recipientEmails.some(rec => normalizeDotmail(rec) === normalizedTarget);
              } else {
                isTargetDotmail = recipientEmails.includes(targetEmail);
              }

              if (!isTargetDotmail) continue;

              const textContent = parsed.text || '';
              const htmlContent = parsed.html || '';
              const strippedHtml = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              const combinedText = `${parsed.subject || ''}\n${textContent}\n${strippedHtml}`;
              const otp = extractOtp(combinedText);

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
        code: extractOtp(content),
        receivedAt: e.received_at,
      };
    });

    return NextResponse.json({ emails: result, address: addressLower });
  } catch (err) {
    console.error('[OTP] POST /verify error:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
