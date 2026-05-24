-- ============================================================
-- TMail - Avatar Storage Migration
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Adds avatar support: profile column + storage bucket
-- ============================================================

-- 1. Add avatar_url column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar in Supabase Storage (avatars bucket)';

-- 2. Create avatars storage bucket (public for direct URL access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Storage RLS policies for avatars bucket
-- Anyone can view avatars (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'avatars_view_public' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "avatars_view_public"
      ON storage.objects FOR SELECT
      TO authenticated, anon
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Authenticated users can upload to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'avatars_insert_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "avatars_insert_own"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Users can update their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'avatars_update_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "avatars_update_own"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Users can delete their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'avatars_delete_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "avatars_delete_own"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT avatar_url FROM public.profiles LIMIT 5;
-- SELECT * FROM storage.buckets WHERE id = 'avatars';
