/**
 * Admin Blocklist Routes
 */
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
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
 * GET /api/admin/blocklist
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: entries, error } = await supabaseAdmin!.from('ip_blocklist').select('*').order('blocked_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch blocklist' }, { status: 500 });
  }

  const enrichedEntries = await Promise.all((entries || []).map(async (entry: any) => {
    let blockedByName = '';
    if (entry.blocked_by) {
      try {
        const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(entry.blocked_by);
        blockedByName = authUser?.user?.email || '';
      } catch { /* ignore */ }
    }
    return {
      ip: entry.ip,
      reason: entry.reason || '',
      blockedAt: entry.blocked_at,
      expiresAt: entry.expires_at,
      blockedBy: blockedByName,
    };
  }));

  return NextResponse.json({ entries: enrichedEntries });
}

/**
 * POST /api/admin/blocklist
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const schema = Joi.object({
    ip: Joi.string().required(),
    reason: Joi.string().max(500).default(''),
    expiresInHours: Joi.number().positive().max(8760).default(null),
  });

  const { error: schemaError, value } = schema.validate(await request.json());
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  const expiresAt = value.expiresInHours ? new Date(Date.now() + value.expiresInHours * 3600000).toISOString() : null;

  const { data: entry, error: upsertError } = await supabaseAdmin!.from('ip_blocklist').upsert({
    ip: value.ip,
    reason: value.reason || '',
    blocked_by: auth.user!.id,
    blocked_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: 'ip' }).select().maybeSingle();

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to block IP' }, { status: 500 });
  }

  return NextResponse.json(entry, { status: 201 });
}
