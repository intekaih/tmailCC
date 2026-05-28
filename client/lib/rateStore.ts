/**
 * Rate Limiting Store - In-memory (per-instance)
 * For production with multiple instances, use Redis
 */
const store = new Map<string, { count: number; resetAt: number }>();

export function getRateStore() {
  return {
    async incr(key: string, ttlSeconds: number): Promise<number> {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + ttlSeconds * 1000 });
        return 1;
      }

      entry.count++;
      return entry.count;
    },

    async get(key: string): Promise<number> {
      const entry = store.get(key);
      if (!entry || entry.resetAt < Date.now()) return 0;
      return entry.count;
    },
  };
}
