-- ============================================================
-- SECURITY FIX: Remove dangerous open RLS policies
-- ============================================================
-- Date: 2026-05-28
-- Issue: accounts_select_anon and emails_select_anon policies
--        use `using (true)` which allows ANY anonymous user to
--        read ALL data via Supabase client-side JS SDK.
-- Fix:   Replace with policies that only allow anon to see
--        guest accounts (user_id IS NULL) and their emails.
-- ============================================================

-- Step 1: Drop the dangerous open policies
DROP POLICY IF EXISTS "accounts_select_anon" ON public.accounts;
DROP POLICY IF EXISTS "emails_select_anon" ON public.emails;

-- Step 2: Create safe replacement policies

-- Anon users can only view guest accounts (user_id IS NULL)
-- This is needed for Supabase Realtime subscriptions on guest accounts
CREATE POLICY "accounts_select_anon_safe"
  ON public.accounts FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Anon users can only view emails belonging to guest accounts
-- This is needed for Supabase Realtime subscriptions on guest emails
CREATE POLICY "emails_select_anon_safe"
  ON public.emails FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = account_id AND user_id IS NULL
    )
  );

-- ============================================================
-- VERIFY: List all policies after migration
-- ============================================================
-- Uncomment to verify:
-- SELECT policyname, tablename, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('accounts', 'emails')
-- ORDER BY tablename, policyname;
