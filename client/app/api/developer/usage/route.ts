/**
 * Developer API Routes - Usage Statistics
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const profile = await getProfile(decoded.sub);
  if (!profile) {
    return { error: 'User not found', status: 401 };
  }

  if (!profile.is_active) {
    return { error: 'Account is disabled', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

/**
 * GET /api/developer/usage - Get usage stats
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get user's API keys count
    const { count: apiKeysCount } = await supabaseAdmin!
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Get user's webhooks count
    const { count: webhooksCount } = await supabaseAdmin!
      .from('webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Get API usage for today
    const apiKeyIds = await supabaseAdmin!
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id);

    const keyIds = (apiKeyIds.data || []).map((k: any) => k.id);

    let apiCallsToday = 0;
    let apiCallsThisMonth = 0;

    if (keyIds.length > 0) {
      const { count: todayCount } = await supabaseAdmin!
        .from('api_usage_logs')
        .select('id', { count: 'exact', head: true })
        .in('api_key_id', keyIds)
        .gte('created_at', startOfDay);

      const { count: monthCount } = await supabaseAdmin!
        .from('api_usage_logs')
        .select('id', { count: 'exact', head: true })
        .in('api_key_id', keyIds)
        .gte('created_at', startOfMonth);

      apiCallsToday = todayCount || 0;
      apiCallsThisMonth = monthCount || 0;
    }

    // Get webhook deliveries
    const webhookIds = await supabaseAdmin!
      .from('webhooks')
      .select('id')
      .eq('user_id', user.id);

    const whIds = (webhookIds.data || []).map((w: any) => w.id);

    let webhookDeliveriesToday = 0;
    let webhookDeliveriesThisMonth = 0;

    if (whIds.length > 0) {
      const { count: todayWhCount } = await supabaseAdmin!
        .from('webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .in('webhook_id', whIds)
        .gte('created_at', startOfDay);

      const { count: monthWhCount } = await supabaseAdmin!
        .from('webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .in('webhook_id', whIds)
        .gte('created_at', startOfMonth);

      webhookDeliveriesToday = todayWhCount || 0;
      webhookDeliveriesThisMonth = monthWhCount || 0;
    }

    // Get user's accounts count
    const { count: accountsCount } = await supabaseAdmin!
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Query user's accounts list to fetch email stats
    const { data: userAccounts } = await supabaseAdmin!
      .from('accounts')
      .select('id')
      .eq('user_id', user.id);

    const accountIds = (userAccounts || []).map((acc: any) => acc.id);

    let emailsCount = 0;
    let emailsToday = 0;

    if (accountIds.length > 0) {
      const [totalEmailsRes, todayEmailsRes] = await Promise.all([
        supabaseAdmin!
          .from('emails')
          .select('id', { count: 'exact', head: true })
          .in('account_id', accountIds)
          .eq('is_deleted', false),
        supabaseAdmin!
          .from('emails')
          .select('id', { count: 'exact', head: true })
          .in('account_id', accountIds)
          .eq('is_deleted', false)
          .gte('received_at', startOfDay)
      ]);
      emailsCount = totalEmailsRes.count || 0;
      emailsToday = todayEmailsRes.count || 0;
    }

    return NextResponse.json({
      apiKeys: {
        total: apiKeysCount || 0,
        active: apiKeysCount || 0,
      },
      webhooks: {
        total: webhooksCount || 0,
        active: webhooksCount || 0,
      },
      apiCalls: {
        today: apiCallsToday,
        thisMonth: apiCallsThisMonth,
      },
      webhookDeliveries: {
        today: webhookDeliveriesToday,
        thisMonth: webhookDeliveriesThisMonth,
      },
      accounts: {
        total: accountsCount || 0,
      },
      emails: {
        total: emailsCount,
        today: emailsToday,
      },
    });
  } catch (err) {
    console.error('[Developer] GET /usage error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
