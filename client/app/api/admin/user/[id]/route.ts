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

  try {
    // Cascade cleanup: delete all user-owned data before removing auth user
    // 1. Delete emails belonging to user's accounts
    const { data: userAccounts } = await supabaseAdmin!
      .from('accounts')
      .select('id')
      .eq('user_id', id);

    if (userAccounts && userAccounts.length > 0) {
      const accountIds = userAccounts.map((a: any) => a.id);
      await supabaseAdmin!.from('emails').delete().in('account_id', accountIds);
    }

    // 2. Delete user's accounts
    await supabaseAdmin!.from('accounts').delete().eq('user_id', id);

    // 3. Delete webhook deliveries (via webhooks)
    const { data: userWebhooks } = await supabaseAdmin!
      .from('webhooks')
      .select('id')
      .eq('user_id', id);

    if (userWebhooks && userWebhooks.length > 0) {
      const webhookIds = userWebhooks.map((w: any) => w.id);
      await supabaseAdmin!.from('webhook_deliveries').delete().in('webhook_id', webhookIds);
    }

    // 4. Delete webhooks
    await supabaseAdmin!.from('webhooks').delete().eq('user_id', id);

    // 5. Delete API usage logs (via api_keys)
    const { data: userApiKeys } = await supabaseAdmin!
      .from('api_keys')
      .select('id')
      .eq('user_id', id);

    if (userApiKeys && userApiKeys.length > 0) {
      const apiKeyIds = userApiKeys.map((k: any) => k.id);
      await supabaseAdmin!.from('api_usage_logs').delete().in('api_key_id', apiKeyIds);
    }

    // 6. Delete API keys
    await supabaseAdmin!.from('api_keys').delete().eq('user_id', id);

    // 7. Delete auth user (this cascades to profile via FK)
    await supabaseAdmin!.auth.admin.deleteUser(id);

    // 8. Delete profile (safety net if FK cascade didn't fire)
    await supabaseAdmin!.from('profiles').delete().eq('id', id);

    console.log(`[Admin] User ${id} and all associated data deleted`);
    return NextResponse.json({ message: 'User and all associated data deleted' });
  } catch (err) {
    console.error('[Admin] Delete user error:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
