/**
 * JWT Authentication Utilities
 */
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase/admin';

function getJwtSecret() {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_JWT_SECRET or JWT_SECRET is required in production');
  }
  return secret || 'tmail-dev-secret-change-in-production';
}

const JWT_SECRET = getJwtSecret();

export interface TokenPayload {
  sub: string;
  username?: string;
  email?: string;
  role: string;
  isGuest?: boolean;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;

  // Try SUPABASE_JWT_SECRET first
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (supabaseJwtSecret) {
    try {
      const decoded = jwt.verify(token, supabaseJwtSecret, { algorithms: ['HS256'] }) as TokenPayload;
      return decoded;
    } catch {
      // Fall through
    }
  }

  // Fall back to JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function getProfile(userId: string) {
  if (!supabaseAdmin || !userId) return null;

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Auth] Profile lookup failed:', error);
    return null;
  }

  return profile || null;
}
