/**
 * Developer API Routes - API Keys and Webhooks Management
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { API_KEY_SCOPES, WEBHOOK_EVENTS } from '@/lib/constants';
import { apiOk, apiErr, apiUnauthorized, apiForbidden } from '@/lib/types';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';

export type Scope = typeof API_KEY_SCOPES[number];

interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  key_hint: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Webhook {
  id: string;
  user_id: string;
  url: string;
  name: string;
  events: string[];
  secret: string;
  secret_hint: string;
  is_active: boolean;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

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

  return {
    user: {
      id: decoded.sub,
      username: profile.username as string,
      role: profile.role as 'user' | 'admin',
      is_active: profile.is_active as unknown as boolean,
    }
  };
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): { raw: string; prefix: string; hash: string; hint: string } {
  const raw = 'tmail_' + crypto.randomBytes(24).toString('hex');
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);
  const hint = '****' + raw.slice(-4);
  return { raw, prefix, hash, hint };
}

function generateWebhookSecret(): { raw: string; hint: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hint = '****' + raw.slice(-8);
  return { raw, hint };
}

// ============================================
// API KEYS
// ============================================

/**
 * GET /api/developer/keys - List user's API keys
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return apiUnauthorized(auth.error);
  }

  const user = auth.user!;

  try {
    const { data: keys, error } = await supabaseAdmin!
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Developer] Failed to fetch API keys:', error);
      return apiErr('DB_ERROR', 'Failed to fetch API keys', 500);
    }

    const formattedKeys = (keys || []).map((key: ApiKey) => {
      let rawKey = '';
      if (key.prefix && isEncrypted(key.prefix)) {
        try {
          rawKey = decrypt(key.prefix);
        } catch (e) {
          console.error('[Developer] Failed to decrypt API key prefix:', e);
        }
      }
      return {
        id: key.id,
        name: key.name,
        prefix: key.key_hint,
        key: rawKey || null,
        scopes: key.scopes,
        expiresAt: key.expires_at,
        lastUsedAt: key.last_used_at,
        isActive: key.is_active,
        createdAt: key.created_at,
      };
    });

    return apiOk({ keys: formattedKeys });
  } catch (err) {
    console.error('[Developer] GET /keys error:', err);
    return apiErr('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * POST /api/developer/keys - Create new API key
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return apiUnauthorized(auth.error);
  }

  const user = auth.user!;

  try {
    const body = await request.json();
    const { name, scopes = [], expiresAt } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiErr('VALIDATION_ERROR', 'Name is required', 400);
    }

    if (name.length > 100) {
      return apiErr('VALIDATION_ERROR', 'Name must be less than 100 characters', 400);
    }

    // Validate scopes
    const validScopes = scopes.filter((s: string) => API_KEY_SCOPES.includes(s as Scope));
    if (validScopes.length === 0) {
      return apiErr('VALIDATION_ERROR', 'At least one scope is required', 400);
    }

    // Check for accounts:create scope and ensure accounts:read is included
    if (validScopes.includes('accounts:create') && !validScopes.includes('accounts:read')) {
      validScopes.push('accounts:read');
    }

    const { raw, prefix, hash, hint } = generateApiKey();
    const expiresAtValue = expiresAt ? new Date(expiresAt).toISOString() : null;
    const encryptedKey = encrypt(raw);

    const { data: apiKey, error } = await supabaseAdmin!
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name.trim(),
        prefix: encryptedKey,
        key_hash: hash,
        key_hint: hint,
        scopes: validScopes,
        expires_at: expiresAtValue,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Developer] Failed to create API key:', error);
      return apiErr('DB_ERROR', 'Failed to create API key', 500);
    }

    // Return the raw key ONLY this time
    return apiOk({
      id: apiKey.id,
      name: apiKey.name,
      key: raw, // Only returned once!
      prefix: apiKey.key_hint,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expires_at,
      createdAt: apiKey.created_at,
    }, { status: 201 } as ResponseInit);
  } catch (err) {
    console.error('[Developer] POST /keys error:', err);
    return apiErr('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
