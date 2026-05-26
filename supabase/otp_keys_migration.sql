-- ============================================================
-- OTP Access Keys - Migration
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.otp_keys (
  address text primary key,
  access_key text,
  access_key_hash text,
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.otp_keys add column if not exists access_key_hash text;
alter table public.otp_keys alter column access_key drop not null;

-- Backfill existing plaintext keys once, then remove plaintext values.
update public.otp_keys
set access_key_hash = encode(digest(access_key, 'sha256'), 'hex')
where access_key_hash is null and access_key is not null;

update public.otp_keys
set access_key = null
where access_key is not null and access_key_hash is not null;

comment on table public.otp_keys is 'OTP page access keys - admin generates, user uses email|key to view emails';

-- Enable RLS (supabaseAdmin bypasses RLS, so only backend can access)
alter table public.otp_keys enable row level security;

-- No public policies = only service_role (supabaseAdmin) can read/write
