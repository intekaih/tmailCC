/**
 * Guest Authentication Utilities
 * 
 * Provides secure guest token generation, hashing, and verification.
 * Guest accounts (user_id = NULL) use a token-based ownership model:
 * - A random token is generated when a guest creates an account
 * - The SHA-256 hash of the token is stored in `guest_owner_token_hash`
 * - The raw token is returned to the client ONCE (client stores in localStorage)
 * - On subsequent requests, the client sends the token via `x-guest-token` header
 * - The server hashes the token and compares against the stored hash
 */
import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Generate a new random guest token and its hash
 */
export function generateGuestToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash a guest token for comparison
 */
export function hashGuestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a guest token against a stored hash using timing-safe comparison
 */
export function verifyGuestToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  try {
    const computedHash = hashGuestToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Extract guest token from request header
 */
export function getGuestTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-guest-token') || null;
}

/**
 * Check if a guest request has access to an account.
 * Returns { allowed: true } or { allowed: false, error, status }.
 * 
 * Rules:
 * - Guest can ONLY access accounts where user_id IS NULL
 * - Guest MUST provide a valid x-guest-token that matches guest_owner_token_hash
 */
export function checkGuestAccess(
  request: NextRequest,
  account: { user_id: string | null; guest_owner_token_hash: string | null }
): { allowed: true } | { allowed: false; error: string; status: number } {
  // Guest cannot access registered user accounts
  if (account.user_id !== null) {
    return { allowed: false, error: 'Access denied', status: 403 };
  }

  // Guest must provide a valid token
  const guestToken = getGuestTokenFromRequest(request);
  if (!guestToken) {
    return { allowed: false, error: 'Guest token required', status: 401 };
  }

  if (!account.guest_owner_token_hash) {
    // Account has no guest token hash — legacy guest account, deny access
    return { allowed: false, error: 'Access denied', status: 403 };
  }

  if (!verifyGuestToken(guestToken, account.guest_owner_token_hash)) {
    return { allowed: false, error: 'Invalid guest token', status: 403 };
  }

  return { allowed: true };
}
