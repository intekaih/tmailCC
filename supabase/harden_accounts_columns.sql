-- ============================================================
-- SECURITY HARDENING: Restrict column-level SELECT on accounts table
-- Neither anon nor authenticated should ever read guest_owner_token_hash.
-- Run this on Supabase Dashboard → SQL Editor
-- ============================================================

-- Revoke full SELECT privilege from public roles
REVOKE SELECT ON public.accounts FROM anon;
REVOKE SELECT ON public.accounts FROM authenticated;

-- Grant SELECT only to safe columns (excludes guest_owner_token_hash)
GRANT SELECT (id, address, local_part, domain, user_id, created_at, last_activity, email_count) 
  ON public.accounts TO anon;
GRANT SELECT (id, address, local_part, domain, user_id, created_at, last_activity, email_count) 
  ON public.accounts TO authenticated;

-- Verify
-- SELECT * FROM public.accounts LIMIT 1; -- (Should FAIL for anon/authenticated if it queries all columns)
