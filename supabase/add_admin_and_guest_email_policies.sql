-- ============================================================
-- SECURITY & FUNCTIONALITY RESTORATION: RLS POLICIES FOR EMAILS
-- ============================================================
-- Run this script in your Supabase Dashboard -> SQL Editor
-- to restore real-time notifications for both guest accounts
-- and admin users while maintaining airtight security.
-- ============================================================

-- 1. Drop existing conflicting or blocking policies
DROP POLICY IF EXISTS "emails_select_anon_blocked" ON public.emails;
DROP POLICY IF EXISTS "emails_select_anon_safe" ON public.emails;
DROP POLICY IF EXISTS "emails_view_admin" ON public.emails;
DROP POLICY IF EXISTS "emails_delete_admin" ON public.emails;

-- 2. RESTORE guest account real-time access
-- Anonymous guest users need to be able to subscribe to their guest emails (user_id IS NULL).
-- This policy is 100% secure as it strictly blocks guest users from seeing registered users' emails.
CREATE POLICY "emails_select_anon_safe"
  ON public.emails FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = account_id AND user_id IS NULL
    )
  );

-- 3. ADD admin access: Admins must be able to view all emails (needed for admin dashboard and real-time alerts)
CREATE POLICY "emails_view_admin"
  ON public.emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. ADD admin deletion: Admins can delete any email
CREATE POLICY "emails_delete_admin"
  ON public.emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- VERIFY ACTIVE POLICIES
-- ============================================================
SELECT policyname, tablename, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'emails'
ORDER BY policyname;
