-- ============================================================
-- Guest mailbox ownership token migration
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.accounts
  add column if not exists guest_owner_token_hash text;
