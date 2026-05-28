/**
 * Rate Limiting Store — Persistent (Supabase-backed)
 * 
 * Uses a dedicated rate_limits table in Supabase for persistence.
 * Falls back to in-memory if DB is unavailable.
 * Works correctly with serverless/multi-instance deployments.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

// In-memory fallback (used when DB is unavailable)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryIncr(key: string, ttlSeconds: number): number {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + ttlSeconds * 1000 });
    return 1;
  }
  entry.count++;
  return entry.count;
}

function memoryGet(key: string): number {
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < Date.now()) return 0;
  return entry.count;
}

export function getRateStore() {
  return {
    /**
     * Increment counter for key. Returns the new count.
     * Uses Supabase upsert with atomic increment for multi-instance safety.
     */
    async incr(key: string, ttlSeconds: number): Promise<number> {
      if (!supabaseAdmin) {
        return memoryIncr(key, ttlSeconds);
      }

      try {
        const now = new Date();
        const resetAt = new Date(now.getTime() + ttlSeconds * 1000);

        // Atomic upsert: insert or increment count
        // Use Supabase RPC for atomic increment to avoid race conditions
        const { data, error } = await supabaseAdmin.rpc('rate_limit_incr', {
          p_key: key,
          p_ttl_seconds: ttlSeconds,
        });

        if (error) {
          // Fallback to in-memory if RPC doesn't exist yet
          console.warn('[RateStore] DB rate limit failed, falling back to memory:', error.message);
          return memoryIncr(key, ttlSeconds);
        }

        return data || 1;
      } catch {
        return memoryIncr(key, ttlSeconds);
      }
    },

    async get(key: string): Promise<number> {
      if (!supabaseAdmin) {
        return memoryGet(key);
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('rate_limits')
          .select('count')
          .eq('key', key)
          .gt('reset_at', new Date().toISOString())
          .maybeSingle();

        if (error || !data) return memoryGet(key);
        return data.count;
      } catch {
        return memoryGet(key);
      }
    },
  };
}
