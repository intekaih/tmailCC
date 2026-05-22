/**
 * Developer API Routes - Delete Webhook
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
 * DELETE /api/developer/webhooks/[id] - Delete webhook
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
    // First verify the webhook belongs to this user
    const { data: existingWebhook, error: fetchError } = await supabaseAdmin!
      .from('webhooks')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Developer] Failed to fetch webhook:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch webhook' }, { status: 500 });
    }

    if (!existingWebhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (existingWebhook.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete webhook (cascade will delete deliveries)
    const { error: deleteError } = await supabaseAdmin!
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Developer] Failed to delete webhook:', deleteError);
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Webhook deleted' });
  } catch (err) {
    console.error('[Developer] DELETE /webhooks/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
