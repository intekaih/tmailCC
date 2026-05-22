/**
 * API v1 - Email Details
 * GET /api/v1/emails/:id - Get email content
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';
import { sanitizeHtml } from '@/lib/services/otpUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request, ['emails:read']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const { id: emailId } = await params;
    const userId = auth.apiKey.userId;
    const { searchParams } = request.nextUrl;
    const shouldSanitize = searchParams.get('sanitize') !== 'false';

    // Get email with account info for ownership check
    const { data: email, error } = await supabaseAdmin
      .from('emails')
      .select(`
        id,
        from_address,
        from_name,
        to_address,
        subject,
        text_content,
        html_content,
        headers,
        attachments,
        is_read,
        is_starred,
        received_at,
        account:accounts!inner(id, user_id)
      `)
      .eq('id', emailId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.error('[API v1] GET /emails/:id query error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch email', 500);
    }

    if (!email) {
      return errorResponse('NOT_FOUND', 'Email not found', 404);
    }

    // Verify ownership
    const account = email.account as unknown as { user_id: string };
    if (account?.user_id !== userId) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Mark as read
    if (!email.is_read) {
      await supabaseAdmin
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId);
    }

    const response = {
      id: email.id,
      from: { address: email.from_address, name: email.from_name },
      to: email.to_address,
      subject: email.subject,
      text: email.text_content,
      html: shouldSanitize ? sanitizeHtml(email.html_content) : email.html_content,
      headers: email.headers || {},
      attachments: ((email.attachments || []) as Array<{ filename: string; contentType: string; size: number }>).map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })),
      isRead: email.is_read,
      isStarred: email.is_starred,
      receivedAt: email.received_at,
    };

    const res = successResponse(response);
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /emails/:id unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
