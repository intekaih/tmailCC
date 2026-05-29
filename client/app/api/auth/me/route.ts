/**
 * GET /api/auth/me - Get current user
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getJwtSecret } from '@/lib/auth';

const JWT_SECRET = getJwtSecret();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('username, role, email_count, preferences, is_active, avatar_url')
      .eq('id', decoded.sub)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(decoded.sub as string);

    const supabaseAccessToken = jwt.sign(
      {
        aud: 'authenticated',
        role: 'authenticated',
        sub: decoded.sub,
        email: decoded.email || authUser?.user?.email || '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { username: profile.username },
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      },
      JWT_SECRET
    );

    return NextResponse.json({
      user: {
        id: decoded.sub,
        username: profile.username,
        email: decoded.email || authUser?.user?.email || '',
        role: profile.role,
        avatarUrl: profile.avatar_url || null,
        emailCount: profile.email_count,
        preferences: profile.preferences,
      },
      supabase_access_token: supabaseAccessToken,
    });
  } catch (err) {
    console.error('[Auth] /me error:', err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { displayName } = body;

    // Fetch current profile to get current preferences
    const { data: profile, error: getError } = await supabaseAdmin
      .from('profiles')
      .select('preferences')
      .eq('id', decoded.sub)
      .maybeSingle();

    if (getError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPreferences = profile.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      displayName: displayName !== undefined ? displayName.trim() : (currentPreferences as any).displayName
    };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', decoded.sub);

    if (updateError) {
      console.error('[Auth] me PATCH error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      preferences: updatedPreferences
    });
  } catch (err) {
    console.error('[Auth] me PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
