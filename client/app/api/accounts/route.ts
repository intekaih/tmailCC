/**
 * GET /api/accounts - List accounts
 * POST /api/accounts - Create account
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { generateGuestToken } from '@/lib/guestAuth';

function generateRandomString(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function hashAccessKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

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
  const account: any = {
    _id: row.id,
    id: row.id,
    address: row.address,
    localPart: row.local_part,
    domain: row.domain,
    user: row.user_id,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
    emailCount: row.email_count || 0,
  };

  if (includeOwner && row.owner) {
    account.owner = {
      id: row.owner.id,
      username: row.owner.username,
      role: row.owner.role,
    };
  }

  return account;
}

async function getOwnerMap(accounts: any[]) {
  const ownerIds = Array.from(new Set(
    accounts
      .map(account => account.user_id)
      .filter(Boolean)
  ));

  if (ownerIds.length === 0) return new Map();

  const { data: profiles, error } = await supabaseAdmin!
    .from('profiles')
    .select('id, username, role')
    .in('id', ownerIds);

  if (error) {
    console.error('[Accounts] Owner profile lookup error:', error);
    return new Map();
  }

  return new Map(profiles.map(p => [p.id, p]));
}

/**
 * GET /api/accounts
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const user = auth.user;

    let query = supabaseAdmin!.from('accounts').select('*', { count: 'exact' });

    // If logged in: admins see all, users see only theirs
    // If guest: return empty array (accounts are managed locally)
    if (!auth.isGuest && user) {
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
    } else {
      // Guest users don't have server-side accounts
      return NextResponse.json({
        accounts: [],
        total: 0,
        skip,
        limit,
      });
    }

    if (domain) query = query.eq('domain', domain);
    if (search) {
      // Escape LIKE special characters to prevent pattern injection
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('address', `%${escapedSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

    const { data: accounts, error, count } = await query;

    if (error) {
      console.error('[Accounts] GET / error:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Fetch counts from the emails table dynamically to prevent out-of-sync bugs
    const accountIds = (accounts || []).map(a => a.id);
    const countsMap = new Map<string, { emailCount: number; unreadCount: number }>();
    
    if (accountIds.length > 0) {
      // 1. Get total active emails count per account
      const { data: totalCounts } = await supabaseAdmin!
        .from('emails')
        .select('account_id')
        .in('account_id', accountIds)
        .eq('is_deleted', false);
        
      // 2. Get unread active emails count per account
      const { data: unreadCounts } = await supabaseAdmin!
        .from('emails')
        .select('account_id')
        .in('account_id', accountIds)
        .eq('is_read', false)
        .eq('is_deleted', false);

      // Initialize map entries
      accountIds.forEach(id => countsMap.set(id, { emailCount: 0, unreadCount: 0 }));

      // Aggregate total counts
      totalCounts?.forEach(e => {
        const entry = countsMap.get(e.account_id);
        if (entry) entry.emailCount++;
      });

      // Aggregate unread counts
      unreadCounts?.forEach(e => {
        const entry = countsMap.get(e.account_id);
        if (entry) entry.unreadCount++;
      });
    }

    const ownerMap = user.role === 'admin' ? await getOwnerMap(accounts || []) : new Map();
    const formattedAccounts = (accounts || []).map((a) => {
      const owner = a.user_id ? ownerMap.get(a.user_id) : null;
      const formatted = formatAccount({ ...a, owner }, user.role === 'admin');
      
      // Override with live dynamic counts
      const counts = countsMap.get(a.id) || { emailCount: 0, unreadCount: 0 };
      formatted.emailCount = counts.emailCount;
      formatted.unreadCount = counts.unreadCount;
      
      return formatted;
    });

    return NextResponse.json({
      accounts: formattedAccounts,
      total: count || (accounts?.length || 0),
      skip,
      limit,
    });
  } catch (err) {
    console.error('[Accounts] GET / unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Allow guests to create accounts without login
    const auth = await authenticate(request, true);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();

    // Check if captcha is enabled
    const { data: captchaEnabledSetting } = await supabaseAdmin!
      .from('config')
      .select('value')
      .eq('key', 'captchaEnabled')
      .maybeSingle();

    const isCaptchaEnabled = captchaEnabledSetting?.value === true || captchaEnabledSetting?.value === 'true';

    if (isCaptchaEnabled && auth.isGuest) {
      const captchaToken = body.captchaToken;
      if (!captchaToken) {
        return NextResponse.json({ error: 'CAPTCHA token is required' }, { status: 400 });
      }

      const { data: captchaSecretSetting } = await supabaseAdmin!
        .from('config')
        .select('value')
        .eq('key', 'captchaSecretKey')
        .maybeSingle();

      const secretKey = captchaSecretSetting?.value || '';

      if (secretKey) {
        try {
          const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: secretKey,
              response: captchaToken,
              remoteip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            return NextResponse.json({ error: 'Xác thực CAPTCHA thất bại, vui lòng thử lại.' }, { status: 400 });
          }
        } catch (err) {
          console.error('[Accounts] CAPTCHA verification failed with error:', err);
          return NextResponse.json({ error: 'Không thể kết nối đến máy chủ CAPTCHA' }, { status: 500 });
        }
      }
    }

    const schema = Joi.object({
      localPart: Joi.string().pattern(/^[a-z0-9.-]{1,64}$/).allow('').default(''),
      domain: Joi.string().domain().required(),
      captchaToken: Joi.string().allow('').optional(),
    });

    const { error: schemaErr, value } = schema.validate(body);
    if (schemaErr) {
      return NextResponse.json({ error: schemaErr.details[0].message }, { status: 400 });
    }

    // For logged-in users, associate account with user
    // For guests, account is not associated with any user (user_id is null)
    const userId = auth.isGuest ? null : auth.user!.id;

    // Verify domain exists and is active
    const { data: domainDoc, error: domainError } = await supabaseAdmin!
      .from('domains')
      .select('id, domain')
      .eq('domain', value.domain.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (domainError) {
      console.error('[Accounts] Domain lookup error:', domainError);
      return NextResponse.json({ error: 'Failed to verify domain' }, { status: 500 });
    }

    if (!domainDoc) {
      return NextResponse.json({ error: 'Domain not available or inactive' }, { status: 400 });
    }

    const localPart = value.localPart.trim() || generateRandomString(12);
    const address = `${localPart}@${value.domain}`.toLowerCase();

    // Check if address already exists
    const { data: existing } = await supabaseAdmin!
      .from('accounts')
      .select('id, address')
      .eq('address', address)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Address already exists' }, { status: 409 });
    }

    // Create account
    const isGuestAccount = userId === null;
    const guestTokenData = isGuestAccount ? generateGuestToken() : null;

    const { data: account, error: insertError } = await supabaseAdmin!
      .from('accounts')
      .insert({
        address,
        local_part: localPart,
        domain: value.domain.toLowerCase(),
        user_id: userId,
        guest_owner_token_hash: guestTokenData?.hash || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Address already exists' }, { status: 409 });
      }
      console.error('[Accounts] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Increment email count for logged-in users only
    if (userId) {
      try {
        await supabaseAdmin!.rpc('increment_email_count', { user_id: userId });
      } catch {
        // RPC might not exist
      }
    }

    let owner = null;
    if (userId && !auth.isGuest) {
      const { data: profile } = await supabaseAdmin!
        .from('profiles')
        .select('id, username, role')
        .eq('id', userId)
        .maybeSingle();
      owner = profile;
    }

    const formatted = formatAccount({ ...account, owner }, true);

    // Include guest token in response (only returned once, on creation)
    if (guestTokenData) {
      return NextResponse.json({ ...formatted, guestToken: guestTokenData.token }, { status: 201 });
    }

    return NextResponse.json(formatted, { status: 201 });
  } catch (err) {
    console.error('[Accounts] POST / unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
