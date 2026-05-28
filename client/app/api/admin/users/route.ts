/**
 * Admin Users Routes
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

function formatUser(row: any) {
  return {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email || '',
    role: row.role,
    isActive: row.is_active,
    emailCount: row.email_count,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

/**
 * GET /api/admin/users
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const role = searchParams.get('role');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');

  let query = supabaseAdmin!.from('profiles').select('id, username, role, is_active, email_count, preferences, created_at, last_login', { count: 'exact' });

  if (role) query = query.eq('role', role);
  if (search) {
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    query = query.ilike('username', `%${escapedSearch}%`);
  }

  query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

  const { data: users, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const enrichedUsers = await Promise.all((users || []).map(async (user: any) => {
    let email = '';
    try {
      const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(user.id);
      email = authUser?.user?.email || '';
    } catch { /* ignore */ }
    return { ...formatUser(user), email };
  }));

  return NextResponse.json({
    users: enrichedUsers,
    total: count || users?.length || 0,
    skip,
    limit,
  });
}

/**
 * POST /api/admin/user - Create user
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(32).required(),
    password: Joi.string().min(8).max(128).required(),
  });

  const { error: schemaError, value } = schema.validate(await request.json());
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  const { username, password } = value;

  const { data: existing } = await supabaseAdmin!.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const placeholderEmail = `${username.toLowerCase()}@tmail.local`;
  const { data: authData, error: authError } = await supabaseAdmin!.auth.admin.createUser({
    email: placeholderEmail,
    password,
    email_confirm: true,
    user_metadata: { username: username.toLowerCase() },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message || 'Failed to create user' }, { status: 400 });
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  await supabaseAdmin!.from('profiles').upsert({ id: authData.user.id, username: username.toLowerCase() }, { onConflict: 'id' });

  const { data: profile } = await supabaseAdmin!.from('profiles').select('*').eq('id', authData.user.id).single();

  return NextResponse.json({ user: formatUser(profile) }, { status: 201 });
}
