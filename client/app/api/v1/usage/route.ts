/**
 * API v1 - Usage Statistics
 * GET /api/v1/usage - Get API usage stats
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';
import * as apiKeyService from '@/lib/services/apiKeyService';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const userId = auth.apiKey.userId;
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get('days') || '7', 10);

    const usageStats = await apiKeyService.getUsageStats(userId, days);

    // Also get account stats
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', userId);

    const accountIds = (accounts || []).map((a: { id: string }) => a.id);
    let emailCount = 0;

    if (accountIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('emails')
        .select('id', { count: 'exact', head: true })
        .in('account_id', accountIds)
        .eq('is_deleted', false);
      emailCount = count || 0;
    }

    const res = successResponse({
      api: {
        totalRequests: usageStats.totalRequests,
        byEndpoint: usageStats.byEndpoint,
        byDay: usageStats.byDay,
      },
      accounts: { count: accountIds.length },
      emails: { count: emailCount },
    });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /usage error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
