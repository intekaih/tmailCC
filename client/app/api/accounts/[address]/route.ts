/**
 * GET /api/accounts/[address]
 * DELETE /api/accounts/[address]
 */
export const dynamic = 'force-dynamic';

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

  return { user: { ...decoded, ...profile }, isGuest: false };
}

function formatAccount(row: any, includeOwner = false) {
  // Destructure to explicitly exclude sensitive fields
  const { guest_owner_token_hash, ...safeRow } = row;
  return {
    _id: safeRow.id,
    id: safeRow.id,
    address: safeRow.address,
    localPart: safeRow.local_part,
    domain: safeRow.domain,
    user: safeRow.user_id,
    createdAt: safeRow.created_at,
    lastActivity: safeRow.last_activity,
    emailCount: safeRow.email_count || 0,
    owner: includeOwner && safeRow.owner ? {
      id: safeRow.owner.id,
      username: safeRow.owner.username,
      role: safeRow.owner.role,
    } : undefined,
  };
}

/**
 * GET /api/accounts/[address]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Allow guests to get account info
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { address } = await params;
    const decodedAddress = decodeURIComponent(address).toLowerCase();

    const { data: account } = await supabaseAdmin!
      .from('accounts')
      .select('*')
      .eq('address', decodedAddress)
      .maybeSingle();

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

    // Get email counts
    const { count: emailCount } = await supabaseAdmin!
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id)
      .eq('is_deleted', false);

    const { count: unreadCount } = await supabaseAdmin!
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id)
      .eq('is_read', false)
      .eq('is_deleted', false);

    return NextResponse.json({
      ...formatAccount(account, auth.user?.role === 'admin'),
      emailCount: emailCount || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (err) {
    console.error('[Accounts] GET /:address error:', err);
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts/[address]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Allow guests to delete their own accounts
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { address } = await params;
    const decodedAddress = decodeURIComponent(address).toLowerCase();

    const { data: account } = await supabaseAdmin!
      .from('accounts')
      .select('id, user_id, address, guest_owner_token_hash')
      .eq('address', decodedAddress)
      .maybeSingle();

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

    // Get email count before deletion
    const { count: emailCount } = await supabaseAdmin!
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id);

    // Delete all emails
    await supabaseAdmin!.from('emails').delete().eq('account_id', account.id);

    // Delete the account
    await supabaseAdmin!.from('accounts').delete().eq('id', account.id);

    // Update email count for logged-in users
    if (account.user_id && emailCount && emailCount > 0 && !auth.isGuest) {
      try {
        await supabaseAdmin!.rpc('decrement_email_count_by', {
          user_id: account.user_id,
          count: emailCount,
        });
      } catch {
        // Fallback
        const { data: userAccounts } = await supabaseAdmin!
          .from('accounts')
          .select('id')
          .eq('user_id', account.user_id);

        if (userAccounts) {
          const accountIds = userAccounts.map((a: any) => a.id);
          const { count: actualCount } = await supabaseAdmin!
            .from('emails')
            .select('id', { count: 'exact', head: true })
            .in('account_id', accountIds)
            .eq('is_deleted', false);

          await supabaseAdmin!.from('profiles')
            .update({ email_count: actualCount || 0 })
            .eq('id', account.user_id);
        }
      }
    }

    return NextResponse.json({ message: 'Account deleted', address: account.address });
  } catch (err) {
    console.error('[Accounts] DELETE /:address error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
