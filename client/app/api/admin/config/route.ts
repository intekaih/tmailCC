/**
 * Admin Config Routes
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
 * GET /api/admin/config
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: configs, error } = await supabaseAdmin!.from('config').select('key, value');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }

  const result: Record<string, any> = {};
  configs.forEach((c: any) => { result[c.key] = c.value; });

  return NextResponse.json(result);
}

/**
 * PUT /api/admin/config
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const allowedKeys = ['rateLimit', 'defaultUserRole', 'maintenanceMode', 'requireEmailVerification', 'maxMailboxStorageMB', 'maxEmailSizeMB', 'captchaEnabled', 'captchaSiteKey', 'captchaSecretKey', 'allowUserOtpKey'];

  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    const { error: upsertError } = await supabaseAdmin!.from('config').upsert({
      key,
      value,
      updated_by: auth.user!.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (upsertError) {
      return NextResponse.json({ error: `Failed to update config key: ${key}` }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Config updated', updates });
}
