/**
 * Admin OTP Key Delete Route
 * DELETE /api/admin/otp-key/:address - Remove OTP access key
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
 * DELETE /api/admin/otp-key/:address - Remove OTP access key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { address: addressParam } = await params;

  try {
    const address = decodeURIComponent(addressParam).toLowerCase();

    const { error } = await supabaseAdmin!
      .from('otp_keys')
      .delete()
      .eq('address', address);

    if (error) {
      console.error('[Admin] DELETE /otp-key error:', error);
      return NextResponse.json({ error: 'Failed to delete OTP key' }, { status: 500 });
    }

    console.log(`[Admin] OTP key deleted for ${address}`);
    return NextResponse.json({ message: 'OTP key deleted' });
  } catch (err) {
    console.error('[Admin] DELETE /otp-key error:', err);
    return NextResponse.json({ error: 'Failed to delete OTP key' }, { status: 500 });
  }
}
