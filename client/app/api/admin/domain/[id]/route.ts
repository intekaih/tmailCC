/**
 * Admin Domain Detail Route
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
 * DELETE /api/admin/domain/[id]
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

  const { data: domain, error } = await supabaseAdmin!.from('domains').delete().eq('id', id).select().maybeSingle();

  if (error || !domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Domain removed' });
}
