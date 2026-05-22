/**
 * API v1 - Emails for Account
 * GET /api/v1/accounts/:address/emails - List emails for an account
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const authResult = await authenticateApiKey(request, ['emails:read']);
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly');

    // Find account and verify ownership
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('address', address)
      .maybeSingle();

    if (accountError) {
      return errorResponse('INTERNAL_ERROR', 'Failed to find account', 500);
    }

    if (!account) {
      return errorResponse('NOT_FOUND', 'Account not found', 404);
    }

    if (account.user_id !== userId) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Query emails
    let query = supabaseAdmin
      .from('emails')
      .select(
        'id, from_address, from_name, to_address, subject, is_read, is_starred, received_at, attachments',
        { count: 'exact' },
      )
      .eq('account_id', account.id)
      .eq('is_deleted', false);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    query = query
      .order('received_at', { ascending: false })
      .range(skip, skip + limit - 1);

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('[API v1] GET /:address/emails query error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch emails', 500);
    }

    const res = successResponse({
      emails: (emails || []).map(e => ({
        id: e.id,
        from: { address: e.from_address, name: e.from_name },
        to: e.to_address,
        subject: e.subject,
        isRead: e.is_read,
        isStarred: e.is_starred,
        receivedAt: e.received_at,
        hasAttachments: (e.attachments || []).length > 0,
      })),
      total: count || 0,
      skip,
      limit,
    });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /:address/emails unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
