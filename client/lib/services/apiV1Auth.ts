/**
 * API v1 Authentication & Rate Limiting
 * Middleware utilities for public Developer API endpoints
 */
import { NextRequest, NextResponse } from 'next/server';
import * as apiKeyService from '@/lib/services/apiKeyService';
import type { ApiKeyInfo } from '@/lib/services/apiKeyService';

// ============================================
// Configuration
// ============================================

const DEFAULT_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.API_RATE_LIMIT_WINDOW || '60', 10);

// In-memory rate limit store (per key)
const rateLimitStore = new Map<string, { windowStart: number; count: number }>();

// Debounce last_used_at updates (at most every 5 minutes)
const lastUsedDebounce = new Map<string, number>();
const LAST_USED_DEBOUNCE_MS = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

export interface AuthenticatedApiRequest {
  apiKey: ApiKeyInfo;
  startTime: number;
}

export interface ApiError {
  code: string;
  message: string;
}

// ============================================
// Rate Limiting
// ============================================

function checkRateLimit(keyId: string, limit = DEFAULT_RATE_LIMIT) {
  const now = Date.now();
  const key = `ratelimit:${keyId}`;

  let entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW * 1000) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW * 1000;

  return { allowed: entry.count <= limit, remaining, resetAt };
}

// ============================================
// Response Helpers
// ============================================

export function successResponse(data: unknown, statusCode = 200) {
  return NextResponse.json({ success: true, data }, { status: statusCode });
}

export function errorResponse(code: string, message: string, statusCode = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: statusCode },
  );
}

// ============================================
// Client IP
// ============================================

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ============================================
// API Key Authentication
// ============================================

export async function authenticateApiKey(
  request: NextRequest,
  requiredScopes: string[] = [],
): Promise<{ auth: AuthenticatedApiRequest } | { error: NextResponse }> {
  // Extract API key from Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: errorResponse(
        'UNAUTHORIZED',
        'API key required. Include "Authorization: Bearer <key>" header.',
        401,
      ),
    };
  }

  const rawKey = authHeader.slice(7);

  // Validate the key
  const result = await apiKeyService.validateApiKey(rawKey);

  if (!result || !result.valid || !result.apiKey) {
    const reason = result?.reason || 'invalid';
    const message =
      reason === 'inactive'
        ? 'API key has been revoked.'
        : reason === 'expired'
          ? 'API key has expired.'
          : 'Invalid API key.';

    return { error: errorResponse('UNAUTHORIZED', message, 401) };
  }

  const { apiKey } = result;

  // Check required scopes
  if (requiredScopes.length > 0) {
    const hasScopes = apiKeyService.hasRequiredScopes(apiKey.scopes, requiredScopes);
    if (!hasScopes) {
      return {
        error: errorResponse(
          'FORBIDDEN',
          `Insufficient scopes. Required: ${requiredScopes.join(', ')}`,
          403,
        ),
      };
    }
  }

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey.id, DEFAULT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    const res = errorResponse(
      'RATE_LIMITED',
      `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
      429,
    );
    res.headers.set('Retry-After', String(retryAfter));
    res.headers.set('X-RateLimit-Limit', String(DEFAULT_RATE_LIMIT));
    res.headers.set('X-RateLimit-Remaining', '0');
    return { error: res };
  }

  // Debounce last_used_at update
  const now = Date.now();
  const lastUpdate = lastUsedDebounce.get(apiKey.id) || 0;
  if (now - lastUpdate >= LAST_USED_DEBOUNCE_MS) {
    lastUsedDebounce.set(apiKey.id, now);
    apiKeyService.updateLastUsed(apiKey.id).catch(() => {});
  }

  return {
    auth: {
      apiKey,
      startTime: Date.now(),
    },
  };
}

/**
 * Optional API key authentication - sets apiKey if valid but doesn't require it
 */
export async function optionalApiKey(
  request: NextRequest,
): Promise<ApiKeyInfo | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const rawKey = authHeader.slice(7);
  const result = await apiKeyService.validateApiKey(rawKey);

  if (result && result.valid && result.apiKey) {
    return result.apiKey;
  }

  return null;
}

// ============================================
// Usage Logging
// ============================================

export function logApiUsage(
  request: NextRequest,
  response: NextResponse,
  auth: AuthenticatedApiRequest,
): void {
  const responseTimeMs = Date.now() - auth.startTime;

  apiKeyService
    .logUsage({
      apiKeyId: auth.apiKey.id,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      statusCode: response.status,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      responseTimeMs,
    })
    .catch(() => {});
}

/**
 * Adds rate limit headers to a response
 */
export function addRateLimitHeaders(response: NextResponse, apiKeyId: string): NextResponse {
  const rateLimit = checkRateLimit(apiKeyId, DEFAULT_RATE_LIMIT);
  response.headers.set('X-RateLimit-Limit', String(DEFAULT_RATE_LIMIT));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  return response;
}
