/**
 * Admin Blocklist IP Detail Route
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
  if (!profile || !profile.is_active || profile.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

/**
 * DELETE /api/admin/blocklist/[ip]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { ip } = await params;
  const decodedIp = decodeURIComponent(ip);

  const { error } = await supabaseAdmin!.from('ip_blocklist').delete().eq('ip', decodedIp);

  if (error) {
    return NextResponse.json({ error: 'Failed to unblock IP' }, { status: 500 });
  }

  return NextResponse.json({ message: 'IP unblocked' });
}
