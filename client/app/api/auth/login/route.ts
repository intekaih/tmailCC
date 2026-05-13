/**
 * Auth Routes - Login, Me, Change Password
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { supabaseAdmin } from '@/lib/supabase/admin';

function getJwtSecret() {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_JWT_SECRET or JWT_SECRET is required in production');
  }
  return secret || 'tmail-dev-secret-change-in-production';
}

const JWT_SECRET = getJwtSecret();

/**
 * POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, supabase_access_token, supabase_user_id } = body;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Method 1: Login with Supabase access token
    if (supabase_access_token && supabase_user_id) {
      return handleSupabaseTokenLogin(supabase_access_token, supabase_user_id);
    }

    // Method 2: Login with username/password
    const { error: schemaErr } = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).validate({ username, password });

    if (schemaErr) {
      return NextResponse.json({ error: 'Invalid credentials format' }, { status: 400 });
    }

    // Find user by username
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role, is_active')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    // Get auth user email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (!authUser?.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password via Supabase Auth API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email: authUser.user.email, password }),
    });

    const authData = await response.json();

    if (authData?.error) {
      return NextResponse.json({ error: authData.error_description || 'Invalid credentials' }, { status: 401 });
    }

    // Update last_login
    await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id);

    const token = jwt.sign(
      { sub: profile.id, username: profile.username, email: authUser.user.email, role: profile.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      user: { id: profile.id, username: profile.username, email: authUser.user.email, role: profile.role },
      token,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

async function handleSupabaseTokenLogin(supabase_access_token: string, supabase_user_id: string) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  try {
    // Verify the Supabase token via Auth API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${supabase_access_token}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Invalid Supabase token' }, { status: 401 });
    }

    const authUser = await response.json();

    if (authUser.id !== supabase_user_id) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, role, is_active')
      .eq('id', supabase_user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', supabase_user_id);

    const token = jwt.sign(
      { sub: supabase_user_id, username: profile.username, email: authUser.user.email, role: profile.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      user: { id: supabase_user_id, username: profile.username, email: authUser.user.email, role: profile.role },
      token,
    });
  } catch (err) {
    console.error('[Auth] Supabase token login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
