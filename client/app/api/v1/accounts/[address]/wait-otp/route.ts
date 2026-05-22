/**
 * API v1 - Wait for OTP
 * GET /api/v1/accounts/:address/wait-otp - Long-poll for OTP code
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';
import { extractOtp } from '@/lib/services/otpUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const authResult = await authenticateApiKey(request, ['otp:read']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const { address: rawAddress } = await params;
    const address = decodeURIComponent(rawAddress).toLowerCase();
    const userId = auth.apiKey.userId;

    const { searchParams } = request.nextUrl;
    const timeout = Math.min(Math.max(parseInt(searchParams.get('timeout') || '120', 10), 1), 300);
    const interval = Math.min(Math.max(parseInt(searchParams.get('interval') || '2', 10), 1), 30);

    const startTime = Date.now();
    const maxEndTime = startTime + timeout * 1000;

    // Find account and verify ownership
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('address', address)
      .maybeSingle();

    if (accountError || !account) {
      return errorResponse('NOT_FOUND', 'Account not found', 404);
    }

    if (account.user_id !== userId) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Long polling loop
    while (Date.now() < maxEndTime) {
      const { data: emails, error } = await supabaseAdmin
        .from('emails')
        .select('id, from_address, from_name, subject, text_content, html_content, received_at')
        .eq('account_id', account.id)
        .eq('is_deleted', false)
        .order('received_at', { ascending: false })
        .limit(10);

      if (!error && emails && emails.length > 0) {
        for (const email of emails) {
          const combinedText = `${email.subject}\n${email.text_content || ''}\n${email.html_content || ''}`;
          const otpCodes = extractOtp(combinedText);

          if (otpCodes && otpCodes.length > 0) {
            const res = successResponse({
              email: {
                id: email.id,
                from: { address: email.from_address, name: email.from_name },
                subject: email.subject,
                receivedAt: email.received_at,
              },
              otpCodes,
              waitTimeMs: Date.now() - startTime,
            });
            logApiUsage(request, res, auth);
            return res;
          }
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }

    // Timeout reached
    return errorResponse('OTP_TIMEOUT', 'No OTP code detected within timeout period', 408);
  } catch (err) {
    console.error('[API v1] GET /:address/wait-otp error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
