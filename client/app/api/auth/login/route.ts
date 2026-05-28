/**
 * Auth Routes - Login, Me, Change Password
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getJwtSecret } from '@/lib/auth';
import { getRateStore } from '@/lib/rateStore';

const JWT_SECRET = getJwtSecret();

/**
 * POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: prevent brute-force login attempts
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateStore = getRateStore();
    const minuteKey = `login:${ip}:minute`;
    const hourKey = `login:${ip}:hour`;
    const minuteCount = await rateStore.incr(minuteKey, 60);
    const hourCount = await rateStore.incr(hourKey, 3600);

    if (minuteCount > 5 || hourCount > 20) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

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
    // Use ANON_KEY (not SERVICE_ROLE_KEY) — the token endpoint only needs anon access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
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
