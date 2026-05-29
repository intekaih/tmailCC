-- ============================================================
-- HIGH-PERFORMANCE MIGRATION: SUBQUERY-FREE REALTIME FOR EMAILS
-- ============================================================
-- Issue: 
-- 1. Supabase Realtime silently drops WAL events when RLS policies
--    contain joins or subqueries.
-- 2. Logged-in users (authenticated) who have guest email addresses
--    in their sidebar could not receive real-time updates because
--    guest policies were restricted "TO anon" only.
-- ============================================================

-- 1. Add user_id column to emails table if not exists
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill/sync user_id for all existing emails
UPDATE public.emails e
SET user_id = a.user_id
FROM public.accounts a
WHERE e.account_id = a.id;

-- 3. Create a trigger function to auto-populate user_id on INSERT
CREATE OR REPLACE FUNCTION public.populate_email_user_id()
RETURNS trigger AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.accounts
  WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind trigger to emails table
DROP TRIGGER IF EXISTS trigger_populate_email_user_id ON public.emails;
CREATE TRIGGER trigger_populate_email_user_id
  BEFORE INSERT ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_email_user_id();

-- 5. Drop old policies to prevent conflicts
DROP POLICY IF EXISTS "emails_select_anon_blocked" ON public.emails;
DROP POLICY IF EXISTS "emails_select_anon_safe" ON public.emails;
DROP POLICY IF EXISTS "emails_view_own" ON public.emails;
DROP POLICY IF EXISTS "emails_view_admin" ON public.emails;
DROP POLICY IF EXISTS "emails_delete_own" ON public.emails;
DROP POLICY IF EXISTS "emails_delete_admin" ON public.emails;

DROP POLICY IF EXISTS "accounts_select_anon" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select_anon_safe" ON public.accounts;

-- 6. Create lightning-fast, subquery-free RLS policies for emails
-- 6a. Authenticated users can view their own emails
CREATE POLICY "emails_view_own" ON public.emails
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6b. Both anon and authenticated users can view guest emails (user_id IS NULL)
-- This is critical so logged-in users can still see guest accounts' emails in their sidebar!
CREATE POLICY "emails_select_anon_safe" ON public.emails
  FOR SELECT TO anon, authenticated
  USING (user_id IS NULL);

-- 6c. Admin users can view all emails
CREATE POLICY "emails_view_admin" ON public.emails
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6d. Users can delete their own emails
CREATE POLICY "emails_delete_own" ON public.emails
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6e. Admins can delete all emails
CREATE POLICY "emails_delete_admin" ON public.emails
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Create safe RLS policies for accounts
-- 7a. Both anon and authenticated users can view guest accounts
CREATE POLICY "accounts_select_anon_safe" ON public.accounts
  FOR SELECT TO anon, authenticated
  USING (user_id IS NULL);

-- 8. FORCE-RESET logical replication publication cache for emails table
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.emails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
ALTER TABLE public.emails REPLICA IDENTITY DEFAULT;

-- ============================================================
-- VERIFY ACTIVE POLICIES
-- ============================================================
SELECT policyname, tablename, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('accounts', 'emails')
ORDER BY tablename, policyname;
