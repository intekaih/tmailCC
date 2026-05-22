/**
 * API Key Service - TypeScript version
 * Handles generation, validation, and management of API keys
 */
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const KEY_PREFIX = 'tmail';
const KEY_BYTES = 32;

// ============================================
// Types
// ============================================

export interface ApiKeyRecord {
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

export interface ApiKeyInfo {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ValidateResult {
  valid: boolean;
  reason?: 'inactive' | 'expired' | 'invalid';
  apiKey?: ApiKeyInfo;
}

// ============================================
// Core Functions
// ============================================

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(KEY_BYTES).toString('hex');
  return `${KEY_PREFIX}_${randomBytes}`;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function getKeyPrefix(key: string): string {
  const parts = key.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1].substring(0, 8)}`;
  }
  return key.substring(0, 12);
}

export function getKeyHint(key: string): string {
  if (key.length < 4) return key;
  return key.substring(key.length - 4);
}

// ============================================
// CRUD Operations
// ============================================

export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = [],
  expiresAt: Date | null = null,
) {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const prefix = getKeyPrefix(rawKey);
  const keyHint = getKeyHint(rawKey);

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      prefix,
      key_hash: keyHash,
      key_hint: keyHint,
      scopes,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[ApiKeyService] Failed to create API key:', error);
    throw new Error('Failed to create API key');
  }

  return {
    key: rawKey,
    apiKey: {
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      keyHint: data.key_hint,
      scopes: data.scopes,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
  };
}

export async function validateApiKey(key: string): Promise<ValidateResult | null> {
  if (!supabaseAdmin || !key) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, name, prefix, scopes, expires_at, last_used_at, is_active, created_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) {
    console.error('[ApiKeyService] Failed to validate key:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  if (!data.is_active) {
    return { valid: false, reason: 'inactive' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    apiKey: {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes || [],
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
    },
  };
}

export function hasRequiredScopes(keyScopes: string[], requiredScopes: string[]): boolean {
  if (!requiredScopes || requiredScopes.length === 0) return true;
  if (!keyScopes || keyScopes.length === 0) return false;
  return requiredScopes.every(scope => keyScopes.includes(scope));
}

export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    console.error('[ApiKeyService] Failed to revoke key:', error);
    return false;
  }

  return true;
}

export async function updateLastUsed(keyId: string): Promise<void> {
  if (!supabaseAdmin || !keyId) return;

  try {
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch (err) {
    console.error('[ApiKeyService] Failed to update last_used_at:', err);
  }
}

export async function listApiKeys(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, prefix, key_hint, scopes, expires_at, last_used_at, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ApiKeyService] Failed to list keys:', error);
    throw new Error('Failed to list API keys');
  }

  return (data || []).map((key: Record<string, any>) => ({
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    keyHint: key.key_hint,
    scopes: key.scopes || [],
    expiresAt: key.expires_at,
    lastUsedAt: key.last_used_at,
    isActive: key.is_active,
    createdAt: key.created_at,
  }));
}

// ============================================
// Usage Logging
// ============================================

export async function logUsage(params: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string;
  userAgent?: string;
  responseTimeMs?: number | null;
}): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin
      .from('api_usage_logs')
      .insert({
        api_key_id: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        status_code: params.statusCode,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        response_time_ms: params.responseTimeMs,
      });
  } catch (err) {
    console.error('[ApiKeyService] Failed to log usage:', err);
  }
}

export async function getUsageStats(userId: string, days = 7) {
  if (!supabaseAdmin) {
    return { totalRequests: 0, byEndpoint: {} as Record<string, number>, byDay: [] as Array<{ date: string; count: number }> };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: apiKeys } = await supabaseAdmin
    .from('api_keys')
    .select('id')
    .eq('user_id', userId);

  if (!apiKeys || apiKeys.length === 0) {
    return { totalRequests: 0, byEndpoint: {} as Record<string, number>, byDay: [] as Array<{ date: string; count: number }> };
  }

  const keyIds = apiKeys.map((k: { id: string }) => k.id);

  const { data: logs } = await supabaseAdmin
    .from('api_usage_logs')
    .select('endpoint, method, status_code, created_at')
    .in('api_key_id', keyIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (!logs || logs.length === 0) {
    return { totalRequests: 0, byEndpoint: {} as Record<string, number>, byDay: [] as Array<{ date: string; count: number }> };
  }

  const totalRequests = logs.length;
  const byEndpoint: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const log of logs) {
    const endpointKey = `${log.method} ${log.endpoint}`;
    byEndpoint[endpointKey] = (byEndpoint[endpointKey] || 0) + 1;

    const day = log.created_at.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return {
    totalRequests,
    byEndpoint,
    byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
  };
}
