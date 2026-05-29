-- ============================================================
-- Gmail Dotmail Personalization - Migration
-- ============================================================
-- Run this script in the Supabase Dashboard > SQL Editor
-- to allow regular users to manage their own parent Gmails
-- and generate dotmails.
-- ============================================================

-- 1. Add user_id column to public.gmail_parents referencing profiles(id)
ALTER TABLE public.gmail_parents 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Drop the old admin-only policies
DROP POLICY IF EXISTS "gmail_parents_admin_all" ON public.gmail_parents;
DROP POLICY IF EXISTS "gmail_dotmails_admin_all" ON public.gmail_dotmails;

-- 3. Create RLS policies for public.gmail_parents
-- Admin has all access; authenticated users have access to their own parents.
CREATE POLICY "gmail_parents_policy"
  ON public.gmail_parents FOR ALL
  TO authenticated
  USING (
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    OR
    (user_id = auth.uid())
  )
  WITH CHECK (
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    OR
    (user_id = auth.uid())
  );

-- 4. Create RLS policies for public.gmail_dotmails
-- Admin has all access; authenticated users have access to dotmails referencing their own parents.
CREATE POLICY "gmail_dotmails_policy"
  ON public.gmail_dotmails FOR ALL
  TO authenticated
  USING (
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    OR
    (exists (select 1 from public.gmail_parents p where p.id = parent_id and p.user_id = auth.uid()))
  )
  WITH CHECK (
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    OR
    (exists (select 1 from public.gmail_parents p where p.id = parent_id and p.user_id = auth.uid()))
  );
