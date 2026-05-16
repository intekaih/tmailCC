/**
 * PATCH /api/emails/[id]/read - Mark as read/unread
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function authenticate(request: NextRequest, allowGuest = false) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (allowGuest) return { user: null, isGuest: true };
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

  return { user: { ...decoded, ...profile, role: profile.role }, isGuest: false };
}

function formatEmail(row: any) {
  return {
    _id: row.id,
    id: row.id,
    account: row.account_id,
    messageId: row.message_id || '',
    from: row.from_address || '',
    fromName: row.from_name || '',
    to: row.to_address || '',
    subject: row.subject || '(No Subject)',
    text: row.text_content || '',
    html: row.html_content || '',
    attachments: row.attachments || [],
    receivedAt: row.received_at,
    isRead: row.is_read || false,
    isStarred: row.is_starred || false,
    isDeleted: row.is_deleted || false,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow guests to mark emails as read
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { isRead = true } = await request.json();

    const { data: email, error: emailError } = await supabaseAdmin!.from('emails').select('*').eq('id', id).maybeSingle();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const { data: account, error: accountError } = await supabaseAdmin!.from('accounts').select('id, address, user_id').eq('id', email.account_id).maybeSingle();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access for logged-in users
    if (!auth.isGuest && auth.user) {
      if (auth.user.role !== 'admin' && account.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { data: updated, error } = await supabaseAdmin!.from('emails').update({ is_read: isRead }).eq('id', id).select().maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json(formatEmail(updated));
  } catch (err) {
    console.error('[Emails] PATCH /:id/read error:', err);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}
