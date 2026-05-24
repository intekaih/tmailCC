-- ============================================================
-- TMail - Supabase Storage Setup
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Creates storage buckets for attachments
-- ============================================================

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Create bucket for email attachments
-- public: accessible via signed URLs or RLS policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip'];

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================
-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Anyone can view attachments (attachments are public by nature of email)
create policy "attachments_view_public"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'attachments');

-- Users can upload attachments to their own folder
create policy "attachments_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own attachments
create policy "attachments_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage all attachments
create policy "attachments_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to generate a secure storage path for attachments
create or replace function storage.generate_attachment_path(
  user_id uuid,
  filename text
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  ext text;
  safe_filename text;
begin
  ext := lower(regexp_replace(filename, '.*\.', '.'));
  safe_filename := encode(
    digest(random()::text || now()::text || filename, 'sha256'),
    'hex'
  ) || ext;
  return user_id::text || '/' || safe_filename;
end;
$$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify storage setup:
-- select * from storage.buckets;
-- select * from storage.objects limit 10;
