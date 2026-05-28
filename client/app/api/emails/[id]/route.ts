/**
 * GET /api/emails/[id]
 * DELETE /api/emails/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { checkGuestAccess } from '@/lib/guestAuth';

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

/**
 * GET /api/emails/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow guest access (matches /api/emails/route.ts pattern)
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const { data: email, error: emailError } = await supabaseAdmin!.from('emails').select('*').eq('id', id).maybeSingle();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const { data: account, error: accountError } = await supabaseAdmin!.from('accounts').select('id, address, user_id, guest_owner_token_hash').eq('id', email.account_id).maybeSingle();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access — same pattern as /api/emails/route.ts
    if (auth.isGuest) {
      const guestAccess = checkGuestAccess(request, account);
      if (!guestAccess.allowed) {
        return NextResponse.json({ error: guestAccess.error }, { status: guestAccess.status });
      }
    } else if (auth.user) {
      if (auth.user.role !== 'admin' && account.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark as read
    await supabaseAdmin!.from('emails').update({ is_read: true }).eq('id', id);

    return NextResponse.json(formatEmail({ ...email, is_read: true }));
  } catch (err) {
    console.error('[Emails] GET /:id error:', err);
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}

/**
 * DELETE /api/emails/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow guest access — guest can delete individual emails from their accounts
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const { data: email, error: emailError } = await supabaseAdmin!.from('emails').select('*').eq('id', id).maybeSingle();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const { data: account, error: accountError } = await supabaseAdmin!.from('accounts').select('id, address, user_id, guest_owner_token_hash').eq('id', email.account_id).maybeSingle();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access — same pattern as /api/emails/route.ts
    if (auth.isGuest) {
      const guestAccess = checkGuestAccess(request, account);
      if (!guestAccess.allowed) {
        return NextResponse.json({ error: guestAccess.error }, { status: guestAccess.status });
      }
    } else if (auth.user) {
      if (auth.user.role !== 'admin' && account.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin!.from('emails').update({ is_deleted: true }).eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Email deleted', id });
  } catch (err) {
    console.error('[Emails] DELETE /:id error:', err);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}
