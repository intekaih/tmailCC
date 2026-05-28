/**
 * Admin OTP Keys Routes
 * GET  /api/admin/otp-keys  - List all OTP access keys
 * POST /api/admin/otp-key   - Generate OTP access key for an email address
 */
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import crypto from 'crypto';
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

function hashAccessKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * GET /api/admin/otp-keys - List all OTP access keys
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: keys, error } = await supabaseAdmin!
      .from('otp_keys')
      .select('address, note, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] GET /otp-keys error:', error);
      return NextResponse.json({ error: 'Failed to fetch OTP keys' }, { status: 500 });
    }

    return NextResponse.json({ keys: keys || [] });
  } catch (err) {
    console.error('[Admin] GET /otp-keys error:', err);
    return NextResponse.json({ error: 'Failed to fetch OTP keys' }, { status: 500 });
  }
}

/**
 * POST /api/admin/otp-key - Generate OTP access key for an email address
 * Body: { address: "user1@kaih.co.uk", note?: "Cấp cho Minh" }
 * Returns: { address, accessKey, credential }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const schema = Joi.object({
      address: Joi.string().email().required(),
      note: Joi.string().allow('').max(200).default(''),
    });

    const body = await request.json();
    const { error: schemaError, value } = schema.validate(body);
    if (schemaError) {
      return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
    }

    const address = value.address.toLowerCase();
    const accessKey = crypto.randomBytes(16).toString('hex'); // 128-bit access key

    const { data: key, error: upsertError } = await supabaseAdmin!
      .from('otp_keys')
      .upsert({
        address,
        access_key: null,
        access_key_hash: hashAccessKey(accessKey),
        note: value.note || '',
        created_at: new Date().toISOString(),
      }, { onConflict: 'address' })
      .select()
      .single();

    if (upsertError) {
      console.error('[Admin] POST /otp-key error:', upsertError);
      return NextResponse.json({ error: 'Failed to create OTP key' }, { status: 500 });
    }

    console.log(`[Admin] OTP key generated for ${address}`);

    return NextResponse.json({
      address: key.address,
      accessKey: accessKey,  // Return locally-generated key, NOT DB value
      credential: `${key.address}|${accessKey}`,
      note: key.note,
      createdAt: key.created_at,
    }, { status: 201 });
  } catch (err) {
    console.error('[Admin] POST /otp-key error:', err);
    return NextResponse.json({ error: 'Failed to create OTP key' }, { status: 500 });
  }
}
