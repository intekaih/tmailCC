/**
 * Developer API Routes - Delete API Key
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAuth(request: NextRequest) {
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

/**
 * DELETE /api/developer/keys/[id] - Revoke API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;
  const { id } = await params;

  try {
    // First verify the key belongs to this user
    const { data: existingKey, error: fetchError } = await supabaseAdmin!
      .from('api_keys')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Developer] Failed to fetch API key:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
    }

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Revoke by setting is_active to false
    const { error: updateError } = await supabaseAdmin!
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) {
      console.error('[Developer] Failed to revoke API key:', updateError);
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
    }

    return NextResponse.json({ message: 'API key revoked' });
  } catch (err) {
    console.error('[Developer] DELETE /keys/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
