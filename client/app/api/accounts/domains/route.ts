/**
 * GET /api/accounts/domains - List active domains
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: domains, error } = await supabaseAdmin
      .from('domains')
      .select('id, domain, label, is_active, is_default')
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('[Accounts] GET /domains error:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    const formatted = (domains || []).map((d: any) => ({
      _id: d.id,
      id: d.id,
      domain: d.domain,
      label: d.label || '',
      isActive: d.is_active,
      isDefault: d.is_default,
    }));

    return NextResponse.json({ domains: formatted });
  } catch (err) {
    console.error('[Accounts] GET /domains unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
}
