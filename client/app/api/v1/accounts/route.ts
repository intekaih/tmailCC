/**
 * API v1 - Accounts
 * POST /api/v1/accounts - Create new account
 * GET  /api/v1/accounts - List user's accounts
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';

function randomLocalPart(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/v1/accounts - Create new account
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request, ['accounts:create']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const body = await request.json();
    const localPart = body.localPart || '';
    const domain = body.domain;

    if (!domain || typeof domain !== 'string') {
      return errorResponse('VALIDATION_ERROR', '"domain" is required', 400);
    }

    // Verify domain exists and is active
    const { data: domainDoc } = await supabaseAdmin
      .from('domains')
      .select('id, domain')
      .eq('domain', domain.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!domainDoc) {
      return errorResponse('NOT_FOUND', 'Domain not available or inactive', 400);
    }

    const finalLocalPart = localPart || randomLocalPart();
    const address = `${finalLocalPart}@${domain}`.toLowerCase();

    // Check if address exists
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('address', address)
      .maybeSingle();

    if (existing) {
      return errorResponse('CONFLICT', 'Address already exists', 409);
    }

    // Create account
    const { data: account, error: insertError } = await supabaseAdmin
      .from('accounts')
      .insert({
        address,
        local_part: finalLocalPart,
        domain: domain.toLowerCase(),
        user_id: auth.apiKey.userId,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return errorResponse('CONFLICT', 'Address already exists', 409);
      }
      console.error('[API v1] POST /accounts insert error:', insertError);
      return errorResponse('INTERNAL_ERROR', 'Failed to create account', 500);
    }

    const res = successResponse({
      address: account.address,
      localPart: account.local_part,
      domain: account.domain,
      createdAt: account.created_at,
    }, 201);
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] POST /accounts unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

/**
 * GET /api/v1/accounts - List user's accounts
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request, ['accounts:read']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const { searchParams } = request.nextUrl;
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    let query = supabaseAdmin
      .from('accounts')
      .select('id, address, local_part, domain, created_at, last_activity, email_count', { count: 'exact' })
      .eq('user_id', auth.apiKey.userId);

    if (domain) query = query.eq('domain', domain);
    if (search) query = query.ilike('address', `%${search}%`);

    query = query
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    const { data: accounts, error, count } = await query;

    if (error) {
      console.error('[API v1] GET /accounts error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch accounts', 500);
    }

    const res = successResponse({
      accounts: (accounts || []).map(a => ({
        address: a.address,
        localPart: a.local_part,
        domain: a.domain,
        emailCount: a.email_count || 0,
        createdAt: a.created_at,
        lastActivity: a.last_activity,
      })),
      total: count || 0,
      skip,
      limit,
    });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /accounts unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
