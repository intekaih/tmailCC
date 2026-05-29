/**
 * JWT Authentication Utilities
 */
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase/admin';

export function getJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.warn(
      'WARNING: SUPABASE_JWT_SECRET environment variable is missing. ' +
      'Using a fallback dummy secret for compilation.'
    );
    return 'dummy-secret-for-compilation-purposes-only';
  }
  return secret;
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
