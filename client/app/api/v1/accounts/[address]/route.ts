/**
 * API v1 - Account by Address
 * DELETE /api/v1/accounts/:address - Delete account
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';

/**
 * DELETE /api/v1/accounts/:address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const authResult = await authenticateApiKey(request, ['accounts:delete']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const { address: rawAddress } = await params;
    const address = decodeURIComponent(rawAddress).toLowerCase();
    const userId = auth.apiKey.userId;

    // Find account
    const { data: account, error: findError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, address')
      .eq('address', address)
      .maybeSingle();

    if (findError) {
      console.error('[API v1] DELETE /accounts/:address find error:', findError);
      return errorResponse('INTERNAL_ERROR', 'Failed to find account', 500);
    }

    if (!account) {
      return errorResponse('NOT_FOUND', 'Account not found', 404);
    }

    // Check ownership
    if (account.user_id !== userId) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Delete emails
    await supabaseAdmin.from('emails').delete().eq('account_id', account.id);

    // Delete account
    await supabaseAdmin.from('accounts').delete().eq('id', account.id);

    const res = successResponse({ message: 'Account deleted', address });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] DELETE /accounts/:address unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
