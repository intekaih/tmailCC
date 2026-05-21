/**
 * Admin Stats Route - /api/admin/stats
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
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

  if (profile.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

/**
 * GET /api/admin/stats
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [
      usersResult,
      accountsResult,
      emailsResult,
      domainsResult,
      recentEmailsResult,
    ] = await Promise.all([
      supabaseAdmin!.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin!.from('accounts').select('id', { count: 'exact', head: true }),
      supabaseAdmin!.from('emails').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin!.from('domains').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin!.from('emails').select('received_at', { count: 'exact', head: true }).eq('is_deleted', false).gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Get emails by day for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekEmails } = await supabaseAdmin!.from('emails').select('received_at').eq('is_deleted', false).gte('received_at', sevenDaysAgo);

    // Group by day
    const emailsByDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      emailsByDay[key] = 0;
    }

    if (weekEmails) {
      weekEmails.forEach((email: any) => {
        const key = email.received_at.split('T')[0];
        if (emailsByDay[key] !== undefined) {
          emailsByDay[key]++;
        }
      });
    }

    const emailsByDayArray = Object.entries(emailsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalUsers: usersResult.count || 0,
      totalAccounts: accountsResult.count || 0,
      totalEmails: emailsResult.count || 0,
      totalDomains: domainsResult.count || 0,
      recentEmails: recentEmailsResult.count || 0,
      emailsByDay: emailsByDayArray,
      uptime: typeof process !== 'undefined' ? process.uptime() : 0,
    });
  } catch (err) {
    console.error('[Admin] GET /stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
