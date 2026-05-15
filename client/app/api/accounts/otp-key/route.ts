/**
 * POST /api/accounts/otp-key - Generate OTP access key
 */
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

function hashAccessKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function authenticate(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const schema = Joi.object({
      address: Joi.string().email().required(),
      note: Joi.string().allow('').max(200).default(''),
    });

    const { error: schemaErr, value } = schema.validate(await request.json());
    if (schemaErr) {
      return NextResponse.json({ error: schemaErr.details[0].message }, { status: 400 });
    }

    const user = auth.user!;
    const address = value.address.toLowerCase();

    // Check if feature is enabled
    const { data: configData } = await supabaseAdmin!
      .from('config')
      .select('value')
      .eq('key', 'allowUserOtpKey')
      .maybeSingle();

    if (!configData || configData.value !== true) {
      return NextResponse.json({ error: 'Tính năng tạo OTP Key đã bị khoá.' }, { status: 403 });
    }

    // Verify ownership
    const { data: account } = await supabaseAdmin!
      .from('accounts')
      .select('id, user_id')
      .eq('address', address)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && account.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const accessKey = crypto.randomBytes(16).toString('hex');

    const { data: key, error: upsertError } = await supabaseAdmin!
      .from('otp_keys')
      .upsert({
        address,
        access_key: null,
        access_key_hash: hashAccessKey(accessKey),
        note: value.note || 'User generated',
        created_at: new Date().toISOString(),
      }, { onConflict: 'address' })
      .select()
      .single();

    if (upsertError) {
      console.error('[Accounts] POST /otp-key error:', upsertError);
      return NextResponse.json({ error: 'Failed to create OTP key' }, { status: 500 });
    }

    return NextResponse.json({
      address: key.address,
      accessKey,
      credential: `${key.address}|${accessKey}`,
      note: key.note,
      createdAt: key.created_at,
    }, { status: 201 });
  } catch (err) {
    console.error('[Accounts] POST /otp-key error:', err);
    return NextResponse.json({ error: 'Failed to create OTP key' }, { status: 500 });
  }
}
