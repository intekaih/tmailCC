/**
 * Webhook Inbound Route - Receives emails from Cloudflare Worker
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseEmail } from '@/lib/mailParser';
import { triggerWebhooks } from '@/lib/services/webhookService';
import { extractOtp } from '@/lib/services/otpUtils';

function isMissingColumn(error: any, columnName: string) {
  return error?.code === 'PGRST204' || error?.code === '42703' || String(error?.message || '').includes(columnName);
}



const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/webhook/inbound
 */
export async function POST(request: NextRequest) {
  // Body size check
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  const webhookSecret = request.headers.get('x-webhook-secret') || request.headers.get('x-tmail-secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error('[Webhook] WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  if (!webhookSecret) {
    console.warn('[Webhook] Missing webhook secret header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use timing-safe comparison to prevent timing attacks
  // Hash both values first to ensure equal length for timingSafeEqual
  const receivedHash = crypto.createHash('sha256').update(webhookSecret).digest();
  const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest();
  if (!crypto.timingSafeEqual(receivedHash, expectedHash)) {
    console.warn('[Webhook] Invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let envelopeFrom: string, envelopeTo: string, rawEmailBase64: string;

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    envelopeFrom = body.envelopeFrom;
    envelopeTo = body.envelopeTo;
    rawEmailBase64 = body.email;

    if (!envelopeTo || !rawEmailBase64) {
      return NextResponse.json({ error: 'Missing envelopeTo or email data' }, { status: 400 });
    }

    const accountAddress = envelopeTo.toLowerCase().trim();

    // Find existing account
    const { data: existingAccount } = await supabaseAdmin!.from('accounts').select('id, address, user_id, email_count').eq('address', accountAddress).maybeSingle();

    if (!existingAccount) {
      console.warn('[Webhook] No matching account, accepted but discarded:', accountAddress);
      return NextResponse.json({ message: 'No matching account, accepted but discarded' }, { status: 200 });
    }

    // Parse email
    const rawEmailBuffer = Buffer.from(rawEmailBase64, 'base64');
    const parsed = await parseEmail(rawEmailBuffer, existingAccount.id);

    // Content hash for duplicate detection
    const contentHash = crypto.createHash('sha256').update(rawEmailBuffer).digest('hex');

    // Check for duplicate
    const { data: existingEmail, error: hashLookupError } = await supabaseAdmin!.from('emails').select('id').eq('account_id', existingAccount.id).eq('content_hash', contentHash).maybeSingle();

    const hasContentHashColumn = !isMissingColumn(hashLookupError, 'content_hash');
    if (hashLookupError && hasContentHashColumn) {
      console.error('[Webhook] Duplicate lookup failed:', hashLookupError);
      return NextResponse.json({ error: 'Failed to check duplicate email' }, { status: 500 });
    }

    if (existingEmail) {
      console.log('[Webhook] Duplicate email (content hash), ignored:', existingEmail.id);
      return NextResponse.json({ message: 'Duplicate email, ignored' }, { status: 200 });
    }

    const emailPayload: Record<string, any> = {
      account_id: existingAccount.id,
      message_id: parsed.messageId || null,
      from_address: parsed.from,
      from_name: parsed.fromName || '',
      to_address: parsed.to,
      subject: parsed.subject || '(No Subject)',
      text_content: parsed.text || '',
      html_content: parsed.html || '',
      headers: parsed.headers || {},
      attachments: parsed.attachments || [],
      received_at: new Date().toISOString(),
      is_read: false,
      is_starred: false,
      is_deleted: false,
    };

    if (hasContentHashColumn) {
      emailPayload.content_hash = contentHash;
    }

    // Save email
    const { data: email, error: emailError } = await supabaseAdmin!.from('emails').insert(emailPayload).select().single();

    if (emailError) {
      if (emailError.code === '23505') {
        console.log('[Webhook] Duplicate email, ignored:', parsed.messageId);
        return NextResponse.json({ message: 'Duplicate email, ignored' }, { status: 200 });
      }
      console.error('[Webhook] Failed to save email:', emailError);
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
    }

    // Update account stats
    const newEmailCount = (existingAccount.email_count || 0) + 1;
    await supabaseAdmin!.from('accounts').update({
      last_activity: new Date().toISOString(),
      email_count: newEmailCount,
    }).eq('id', existingAccount.id);

    // Update user email count
    if (existingAccount.user_id) {
      try {
        await supabaseAdmin!.rpc('increment_email_count', { user_id: existingAccount.user_id });
      } catch {
        // RPC might not exist
      }
    }

    // Trigger developer webhooks asynchronously (fire and forget)
    if (existingAccount.user_id) {
      const webhookEmailPayload = {
        id: email.id,
        from: { address: email.from_address || '', name: email.from_name || '' },
        to: email.to_address || '',
        subject: email.subject || '(No Subject)',
        text: email.text_content || '',
        html: email.html_content || '',
        headers: email.headers || {},
        receivedAt: email.received_at,
      };

      // Check for OTP codes
      const combinedText = `${email.subject || ''}\n${email.text_content || ''}\n${email.html_content || ''}`;
      const otpCodes = extractOtp(combinedText);

      // Fire email.received webhook
      triggerWebhooks(existingAccount.user_id, 'email.received', {
        event: 'email.received',
        timestamp: new Date().toISOString(),
        data: webhookEmailPayload,
      }).catch(err => console.error('[Webhook] Failed to trigger email.received:', err));

      // Fire otp.detected webhook if OTP found
      if (otpCodes && otpCodes.length > 0) {
        triggerWebhooks(existingAccount.user_id, 'otp.detected', {
          event: 'otp.detected',
          timestamp: new Date().toISOString(),
          data: { email: webhookEmailPayload, otpCodes },
        }).catch(err => console.error('[Webhook] Failed to trigger otp.detected:', err));

        console.log(`[Webhook] OTP detected in email ${email.id}:`, otpCodes);
      }
    }

    console.log(`[Webhook] Email saved: from=${parsed.from} to=${parsed.to} subject=${parsed.subject}`);
    return NextResponse.json({ message: 'OK', emailId: email.id });
  } catch (err) {
    console.error('[Webhook] POST /inbound error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
