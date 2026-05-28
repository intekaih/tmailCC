/**
 * GET /api/emails - List emails
 * DELETE /api/emails/clear - Clear all emails for an account
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

async function getAccountByAddress(address: string) {
  const { data: account, error } = await supabaseAdmin!.from('accounts').select('id, address, user_id, guest_owner_token_hash').eq('address', address.toLowerCase()).maybeSingle();
  if (error) throw error;
  return account;
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
 * GET /api/emails
 */
export async function GET(request: NextRequest) {
  try {
    // Allow guests to read emails
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!address) {
      return NextResponse.json({ error: 'address query param is required' }, { status: 400 });
    }

    const account = await getAccountByAddress(address);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access
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

    let query = supabaseAdmin!.from('emails').select('*', { count: 'exact' }).eq('account_id', account.id).eq('is_deleted', false).order('received_at', { ascending: false }).range(skip, skip + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('[Emails] GET / error:', error);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    const { count: unreadCount } = await supabaseAdmin!.from('emails').select('id', { count: 'exact', head: true }).eq('account_id', account.id).eq('is_read', false).eq('is_deleted', false);

    return NextResponse.json({
      emails: (emails || []).map(formatEmail),
      total: count || emails?.length || 0,
      unreadCount: unreadCount || 0,
      skip,
      limit,
    });
  } catch (err) {
    console.error('[Emails] GET / error:', err);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

/**
 * DELETE /api/emails/clear
 */
export async function DELETE(request: NextRequest) {
  try {
    // Allow guests to clear emails
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'address query param is required' }, { status: 400 });
    }

    const account = await getAccountByAddress(address);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access
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

    const { error, count } = await supabaseAdmin!.from('emails').update({ is_deleted: true }).eq('account_id', account.id).eq('is_deleted', false);

    if (error) {
      console.error('[Emails] DELETE /clear error:', error);
      return NextResponse.json({ error: 'Failed to clear emails' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All emails cleared', deleted: count || 0 });
  } catch (err) {
    console.error('[Emails] DELETE /clear error:', err);
    return NextResponse.json({ error: 'Failed to clear emails' }, { status: 500 });
  }
}
