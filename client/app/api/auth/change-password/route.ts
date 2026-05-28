/**
 * POST /api/auth/change-password
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getJwtSecret } from '@/lib/auth';

const JWT_SECRET = getJwtSecret();

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

export async function POST(request: NextRequest) {
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

    const { error: validationError, value } = changePasswordSchema.validate(await request.json());
    if (validationError) {
      return NextResponse.json({ error: validationError.details[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = value;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('id', decoded.sub)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(decoded.sub as string);
    if (!authUser?.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email: authUser.user.email, password: currentPassword }),
    });

    if (response.status === 400) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(decoded.sub as string, { password: newPassword });

    if (updateError) {
      console.error('[Auth] Password update error:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    console.log(`[Auth] Password changed for user ${decoded.sub}`);
    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
