/**
 * Admin User Detail Routes
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
 * PATCH /api/admin/user/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const schema = Joi.object({
    role: Joi.string().valid('user', 'admin'),
    isActive: Joi.boolean(),
    emailCount: Joi.number().min(0),
  });

  const { error: schemaError, value } = schema.validate(await request.json());
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (value.role !== undefined) updates.role = value.role;
  if (value.isActive !== undefined) updates.is_active = value.isActive;
  if (value.emailCount !== undefined) updates.email_count = value.emailCount;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin!.from('profiles').update(updates).eq('id', id).select().maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(formatUser(user));
}

/**
 * DELETE /api/admin/user/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  if (id === auth.user!.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  await supabaseAdmin!.auth.admin.deleteUser(id).then(() => {}, err => console.error('[Admin] Auth delete error:', err));

  await supabaseAdmin!.from('profiles').delete().eq('id', id).then(() => {}, err => console.error('[Admin] Profile delete error:', err));

  return NextResponse.json({ message: 'User and all associated data deleted' });
}
