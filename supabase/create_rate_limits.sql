-- ============================================================
-- Rate Limiting: Persistent table + atomic RPC function
-- Run this on Supabase Dashboard → SQL Editor
-- ============================================================

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Atomic increment RPC function
-- Handles insert-or-update in a single atomic operation
CREATE OR REPLACE FUNCTION public.rate_limit_incr(
  p_key TEXT,
  p_ttl_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_now TIMESTAMPTZ := now();
  v_reset_at TIMESTAMPTZ := now() + (p_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Try to update existing non-expired entry
  UPDATE public.rate_limits
  SET count = count + 1
  WHERE key = p_key AND reset_at > v_now
  RETURNING count INTO v_count;

  IF FOUND THEN
    RETURN v_count;
  END IF;

  -- Insert or replace expired entry
  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_reset_at)
  ON CONFLICT (key) DO UPDATE
  SET count = 1, reset_at = v_reset_at
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Auto-cleanup: delete expired entries every hour (optional)
-- This prevents the table from growing unbounded
-- Uncomment if you want automatic cleanup:
-- SELECT cron.schedule(
--   'rate-limits-cleanup',
--   '0 * * * *',
--   $$DELETE FROM public.rate_limits WHERE reset_at < now()$$
-- );

-- RLS: No public access to rate_limits (only service_role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Verify
-- SELECT * FROM public.rate_limits LIMIT 10;
