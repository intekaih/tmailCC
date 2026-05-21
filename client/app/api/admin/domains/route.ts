/**
 * Admin Domains Routes
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

function formatDomain(row: any) {
  return {
    _id: row.id,
    id: row.id,
    domain: row.domain,
    label: row.label || '',
    isActive: row.is_active,
    isDefault: row.is_default,
    note: row.note || '',
    createdAt: row.created_at,
  };
}

/**
 * GET /api/admin/domains
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: domains, error } = await supabaseAdmin!.from('domains').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }

  return NextResponse.json({ domains: (domains || []).map(formatDomain) });
}

/**
 * POST /api/admin/domain
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const schema = Joi.object({
    domain: Joi.string().domain().required(),
    label: Joi.string().allow('').max(100).default(''),
    isDefault: Joi.boolean().default(false),
    note: Joi.string().allow('').max(500).default(''),
  });

  const { error: schemaError, value } = schema.validate(await request.json());
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  value.domain = value.domain.toLowerCase();

  if (value.isDefault) {
    await supabaseAdmin!.from('domains').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: domain, error: insertError } = await supabaseAdmin!.from('domains').insert({
    domain: value.domain,
    label: value.label || '',
    is_default: value.isDefault,
    note: value.note || '',
    added_by: auth.user!.id,
  }).select().single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 });
  }

  return NextResponse.json(formatDomain(domain), { status: 201 });
}
