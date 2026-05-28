-- ============================================================
-- FIX: Restrict Realtime anon access to prevent mass surveillance
-- Run this on Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop the current overly-permissive email policy
DROP POLICY IF EXISTS "emails_select_anon_safe" ON emails;

-- Create a stricter policy: anon can only SELECT emails 
-- for guest accounts AND must provide an account_id filter.
-- This prevents subscribing to ALL guest emails via Realtime.
-- The key trick: we don't allow anon SELECT at all — 
-- guest email access is handled by the application layer via supabaseAdmin.
-- Realtime for guest accounts goes through the authenticated user's session.

-- OPTION: Completely remove anon SELECT on emails
-- This is the safest approach — guest emails are already served by
-- API routes using supabaseAdmin (service_role), so anon RLS is unnecessary.
CREATE POLICY "emails_select_anon_blocked" ON emails
  FOR SELECT
  TO anon
  USING (false);  -- Block all anon SELECT on emails

-- Accounts: Keep allowing anon to see guest accounts (needed for account creation)
-- but still restricted to user_id IS NULL only
-- (This policy should already exist from previous migration)
-- DROP POLICY IF EXISTS "accounts_select_anon_safe" ON accounts;
-- CREATE POLICY "accounts_select_anon_safe" ON accounts
--   FOR SELECT
--   TO anon
--   USING (user_id IS NULL);

-- ============================================================
-- VERIFY
-- ============================================================
-- SELECT policyname, tablename, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('accounts', 'emails')
-- ORDER BY tablename, policyname;
