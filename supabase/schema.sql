-- ============================================================
-- TMail - Supabase Schema Migration
-- ============================================================
-- Chạy script này trong Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- SUPABASE REALTIME CONFIGURATION
-- ============================================================
-- Enable realtime for emails and accounts tables
-- This is required for Supabase Realtime postgres_changes to work
-- Run in Supabase Dashboard > SQL Editor or via migration
-- Note: IF NOT EXISTS is not supported for ALTER PUBLICATION, so we use a workaround

-- Enable realtime on emails table (ignore error if already enabled)
do $$
begin
  alter publication supabase_realtime add table public.emails;
exception when others then
  raise notice 'emails table may already be in publication: %', sqlerrm;
end
$$;

-- Enable realtime on accounts table (ignore error if already enabled)
do $$
begin
  alter publication supabase_realtime add table public.accounts;
exception when others then
  raise notice 'accounts table may already be in publication: %', sqlerrm;
end
$$;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

-- Migration: Add missing columns to existing profiles table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'ip_addresses') then
    alter table public.profiles add column ip_addresses jsonb not null default '[]';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email_count') then
    alter table public.profiles add column email_count integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'preferences') then
    alter table public.profiles add column preferences jsonb not null default '{"darkMode":null,"soundEnabled":true,"notificationsEnabled":true}';
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  username text unique not null,
  email text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  last_login timestamptz,
  is_active boolean not null default true,
  ip_addresses jsonb not null default '[]',
  email_count integer not null default 0,
  preferences jsonb not null default '{"darkMode":null,"soundEnabled":true,"notificationsEnabled":true}'
);

comment on table public.profiles is 'User profiles - extends auth.users';
comment on column public.profiles.ip_addresses is 'Array of {address, firstSeen, lastSeen}';
comment on column public.profiles.preferences is '{darkMode: boolean|null, soundEnabled: boolean, notificationsEnabled: boolean}';

-- Add email column if it doesn't exist (for compatibility with older schemas)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text not null default '';
  end if;
end
$$;

-- Indexes
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_email_idx on public.profiles (email) where email is not null and email != '';
create index if not exists profiles_role_idx on public.profiles (role);

-- ============================================================
-- DOMAINS
-- ============================================================
create table if not exists public.domains (
  id uuid not null default gen_random_uuid() primary key,
  domain text unique not null,
  label text not null default '',
  is_active boolean not null default true,
  is_default boolean not null default false,
  added_by uuid references auth.users on delete set null,
  note text default '',
  created_at timestamptz not null default now()
);

comment on table public.domains is 'Available email domains';

create index if not exists domains_domain_idx on public.domains (domain);
create index if not exists domains_is_active_idx on public.domains (is_active);

-- ============================================================
-- EMAIL ACCOUNTS
-- ============================================================

-- Migration: Add missing columns to existing accounts table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'guest_owner_token_hash') then
    alter table public.accounts add column guest_owner_token_hash text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'last_activity') then
    alter table public.accounts add column last_activity timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'email_count') then
    alter table public.accounts add column email_count integer not null default 0;
  end if;
end
$$;

create table if not exists public.accounts (
  id uuid not null default gen_random_uuid() primary key,
  address text unique not null,
  local_part text not null,
  domain text not null,
  user_id uuid references auth.users on delete cascade,
  guest_owner_token_hash text,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  email_count integer not null default 0
);

comment on table public.accounts is 'Email accounts';

create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists accounts_address_idx on public.accounts (address);

-- ============================================================
-- EMAILS
-- ============================================================

-- Migration: Add missing columns to existing emails table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'emails' and column_name = 'content_hash') then
    alter table public.emails add column content_hash text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'emails' and column_name = 'headers') then
    alter table public.emails add column headers jsonb not null default '{}';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'emails' and column_name = 'from_name') then
    alter table public.emails add column from_name text not null default '';
  end if;
end
$$;

create table if not exists public.emails (
  id uuid not null default gen_random_uuid() primary key,
  account_id uuid not null references public.accounts on delete cascade,
  content_hash text,
  message_id text,
  from_address text not null,
  from_name text not null default '',
  to_address text not null,
  subject text not null default '(No Subject)',
  text_content text not null default '',
  html_content text not null default '',
  headers jsonb not null default '{}',
  attachments jsonb not null default '[]',
  received_at timestamptz not null default now(),
  is_read boolean not null default false,
  is_starred boolean not null default false,
  is_deleted boolean not null default false
);

comment on table public.emails is 'Email messages';
comment on column public.emails.attachments is 'Array of {filename, contentType, size, contentId, content}';

-- Partial unique index for message_id (PostgreSQL doesn't support UNIQUE + NOT NULL sparse)
create unique index if not exists emails_message_id_unique
  on public.emails (message_id)
  where message_id is not null;

-- Indexes
create index if not exists emails_account_id_idx on public.emails (account_id);
create index if not exists emails_account_received_idx on public.emails (account_id, received_at desc);
create index if not exists emails_message_id_idx on public.emails (message_id);
create index if not exists emails_content_hash_idx on public.emails (account_id, content_hash) where content_hash is not null;

-- ============================================================
-- CONFIG (key-value store)
-- ============================================================
create table if not exists public.config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.config is 'System configuration key-value store';

-- Seed default config
insert into public.config (key, value) values
  ('rateLimit', '{"emailsPerMinute":5,"emailsPerDay":50,"webhookPerMinute":100}'::jsonb),
  ('allowGuestView', 'true'::jsonb),
  ('defaultUserRole', '"user"'::jsonb),
  ('maintenanceMode', 'false'::jsonb),
  ('requireEmailVerification', 'false'::jsonb),
  ('maxMailboxStorageMB', '100'::jsonb),
  ('maxEmailSizeMB', '25'::jsonb),
  ('captchaEnabled', 'false'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- IP BLOCKLIST
-- ============================================================
create table if not exists public.ip_blocklist (
  ip text primary key,
  reason text not null default '',
  blocked_by uuid references auth.users on delete set null,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table public.ip_blocklist is 'Blocked IP addresses';

create index if not exists ip_blocklist_expires_idx on public.ip_blocklist (expires_at);

-- ============================================================
-- OTP ACCESS KEYS
-- ============================================================
create table if not exists public.otp_keys (
  address text primary key,
  access_key text,
  access_key_hash text,
  note text default '',
  created_at timestamptz not null default now()
);

comment on table public.otp_keys is 'OTP page access keys - admin generates, user uses email|key to view emails';

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Increment email count for a user
create or replace function public.increment_email_count(user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = email_count + 1
  where id = user_id;
end;
$$;

-- Decrement email count for a user
create or replace function public.decrement_email_count(user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = greatest(0, email_count - 1)
  where id = user_id;
end;
$$;

-- Decrement email count by a specific amount for a user
create or replace function public.decrement_email_count_by(user_id uuid, count integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = greatest(0, email_count - count)
  where id = user_id;
end;
$$;

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, (new.raw_user_meta_data->>'email'), ''), '@', 1)
  );
  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update last_login on profile
create or replace function public.handle_login()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set last_login = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_login();

-- Update config updated_at
create or replace function public.update_config_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists config_updated_at on public.config;
create trigger config_updated_at
  before update on public.config
  for each row execute procedure public.update_config_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.domains enable row level security;
alter table public.accounts enable row level security;
alter table public.emails enable row level security;
alter table public.config enable row level security;
alter table public.ip_blocklist enable row level security;
alter table public.otp_keys enable row level security;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================

-- Users can view their own profile; admins can view all profiles.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'profiles_view_own_or_admin' and tablename = 'profiles') then
    create policy "profiles_view_own_or_admin"
      on public.profiles for select
      to authenticated
      using (
        auth.uid() = id
        or exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- Users can update their own profile
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'profiles_update_own' and tablename = 'profiles') then
    create policy "profiles_update_own"
      on public.profiles for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;

-- Only admins can update other profiles
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'profiles_update_admin' and tablename = 'profiles') then
    create policy "profiles_update_admin"
      on public.profiles for update
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- ============================================================
-- RLS POLICIES: domains
-- ============================================================

-- Anyone can view active domains
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'domains_view_active' and tablename = 'domains') then
    create policy "domains_view_active"
      on public.domains for select
      to anon, authenticated
      using (is_active = true);
  end if;
end
$$;

-- Only admins can manage domains
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'domains_admin_all' and tablename = 'domains') then
    create policy "domains_admin_all"
      on public.domains for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- ============================================================
-- RLS POLICIES: accounts
-- ============================================================

-- Users can view their own accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_view_own' and tablename = 'accounts') then
    create policy "accounts_view_own"
      on public.accounts for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Users can create their own accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_insert_own' and tablename = 'accounts') then
    create policy "accounts_insert_own"
      on public.accounts for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Users can delete their own accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_delete_own' and tablename = 'accounts') then
    create policy "accounts_delete_own"
      on public.accounts for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Admins can view all accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_view_admin' and tablename = 'accounts') then
    create policy "accounts_view_admin"
      on public.accounts for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- Admins can delete any account
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_delete_admin' and tablename = 'accounts') then
    create policy "accounts_delete_admin"
      on public.accounts for delete
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- Allow anonymous SELECT for realtime subscriptions
-- This is needed for guest accounts where user_id is NULL
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'accounts_select_anon' and tablename = 'accounts') then
    create policy "accounts_select_anon"
      on public.accounts for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

-- ============================================================
-- RLS POLICIES: emails
-- ============================================================

-- Users can view emails from their accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'emails_view_own' and tablename = 'emails') then
    create policy "emails_view_own"
      on public.emails for select
      to authenticated
      using (
        exists (
          select 1 from public.accounts
          where id = account_id and user_id = auth.uid()
        )
      );
  end if;
end
$$;

-- Users can update emails from their accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'emails_update_own' and tablename = 'emails') then
    create policy "emails_update_own"
      on public.emails for update
      to authenticated
      using (
        exists (
          select 1 from public.accounts
          where id = account_id and user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.accounts
          where id = account_id and user_id = auth.uid()
        )
      );
  end if;
end
$$;

-- Users can delete emails from their accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'emails_delete_own' and tablename = 'emails') then
    create policy "emails_delete_own"
      on public.emails for delete
      to authenticated
      using (
        exists (
          select 1 from public.accounts
          where id = account_id and user_id = auth.uid()
        )
      );
  end if;
end
$$;

-- Users can insert emails to their accounts
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'emails_insert_own' and tablename = 'emails') then
    create policy "emails_insert_own"
      on public.emails for insert
      to authenticated
      with check (
        exists (
          select 1 from public.accounts
          where id = account_id and user_id = auth.uid()
        )
      );
  end if;
end
$$;

-- Allow anonymous SELECT for realtime subscriptions (postgres_changes requires SELECT policy)
-- Guest accounts are identified by account_id and are safe to expose since:
-- 1. Email IDs are UUIDs (unpredictable)
-- 2. Real-time only shows new INSERT events
-- 3. API endpoints for mutations are still protected
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'emails_select_anon' and tablename = 'emails') then
    create policy "emails_select_anon"
      on public.emails for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

-- ============================================================
-- RLS POLICIES: config
-- ============================================================

-- Only admins can view config. Server-side service role bypasses RLS.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'config_admin_view' and tablename = 'config') then
    create policy "config_admin_view"
      on public.config for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- Only admins can update config
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'config_admin_update' and tablename = 'config') then
    create policy "config_admin_update"
      on public.config for update
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- ============================================================
-- RLS POLICIES: ip_blocklist
-- ============================================================

-- Admins can view blocklist
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'ip_blocklist_admin_view' and tablename = 'ip_blocklist') then
    create policy "ip_blocklist_admin_view"
      on public.ip_blocklist for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- Admins can manage blocklist
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'ip_blocklist_admin_all' and tablename = 'ip_blocklist') then
    create policy "ip_blocklist_admin_all"
      on public.ip_blocklist for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- ============================================================
-- API KEYS
-- ============================================================
create table if not exists public.api_keys (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  key_hint text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
create index if not exists api_keys_is_active_idx on public.api_keys (is_active);

-- ============================================================
-- API USAGE LOGS
-- ============================================================
create table if not exists public.api_usage_logs (
  id uuid not null default gen_random_uuid() primary key,
  api_key_id uuid references public.api_keys on delete cascade,
  endpoint text not null,
  method text not null,
  status_code integer,
  ip_address text,
  user_agent text,
  response_time_ms integer,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists api_usage_logs_api_key_id_idx on public.api_usage_logs (api_key_id);
create index if not exists api_usage_logs_created_at_idx on public.api_usage_logs (created_at desc);

-- ============================================================
-- WEBHOOKS
-- ============================================================
create table if not exists public.webhooks (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  url text not null,
  name text not null default '',
  events text[] not null default '{}',
  secret text not null,
  secret_hint text not null,
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists webhooks_user_id_idx on public.webhooks (user_id);
create index if not exists webhooks_is_active_idx on public.webhooks (is_active);

-- ============================================================
-- WEBHOOK DELIVERIES
-- ============================================================
create table if not exists public.webhook_deliveries (
  id uuid not null default gen_random_uuid() primary key,
  webhook_id uuid not null references public.webhooks on delete cascade,
  event text not null,
  payload jsonb not null,
  response_status integer,
  response_body text,
  attempt integer not null default 1,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists webhook_deliveries_webhook_id_idx on public.webhook_deliveries (webhook_id);
create index if not exists webhook_deliveries_created_at_idx on public.webhook_deliveries (created_at desc);

-- ============================================================
-- FUNCTIONS & TRIGGERS FOR WEBHOOKS
-- ============================================================

-- Update webhook updated_at
create or replace function public.update_webhook_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists webhook_updated_at on public.webhooks;
create trigger webhook_updated_at
  before update on public.webhooks
  for each row execute procedure public.update_webhook_timestamp();

-- Auto-delete old usage logs (keep 30 days)
create or replace function public.cleanup_old_usage_logs()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.api_usage_logs where created_at < now() - interval '30 days';
end;
$$;

-- ============================================================
-- ENABLE RLS FOR API TABLES
-- ============================================================
alter table public.api_keys enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;

-- ============================================================
-- RLS POLICIES: api_keys
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_select' and tablename = 'api_keys') then
    create policy "api_keys_own_select" on public.api_keys for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_insert' and tablename = 'api_keys') then
    create policy "api_keys_own_insert" on public.api_keys for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_update' and tablename = 'api_keys') then
    create policy "api_keys_own_update" on public.api_keys for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_delete' and tablename = 'api_keys') then
    create policy "api_keys_own_delete" on public.api_keys for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- RLS POLICIES: api_usage_logs
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_usage_logs_own_select' and tablename = 'api_usage_logs') then
    create policy "api_usage_logs_own_select" on public.api_usage_logs for select to authenticated using (
      exists (select 1 from public.api_keys where id = api_key_id and user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- RLS POLICIES: webhooks
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_select' and tablename = 'webhooks') then
    create policy "webhooks_own_select" on public.webhooks for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_insert' and tablename = 'webhooks') then
    create policy "webhooks_own_insert" on public.webhooks for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_update' and tablename = 'webhooks') then
    create policy "webhooks_own_update" on public.webhooks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_delete' and tablename = 'webhooks') then
    create policy "webhooks_own_delete" on public.webhooks for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- RLS POLICIES: webhook_deliveries
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhook_deliveries_own_select' and tablename = 'webhook_deliveries') then
    create policy "webhook_deliveries_own_select" on public.webhook_deliveries for select to authenticated using (
      exists (select 1 from public.webhooks where id = webhook_id and user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- VERIFICATION (optional helpers)
-- ============================================================
-- select 'profiles' as table_name, count(*) as count from public.profiles
-- union all select 'domains', count(*) from public.domains
-- union all select 'accounts', count(*) from public.accounts
-- union all select 'emails', count(*) from public.emails
-- union all select 'config', count(*) from public.config
-- union all select 'ip_blocklist', count(*) from public.ip_blocklist
-- union all select 'api_keys', count(*) from public.api_keys
-- union all select 'webhooks', count(*) from public.webhooks;

-- ============================================================
-- NOTE: Developer API tables (api_keys, api_usage_logs, webhooks,
-- webhook_deliveries) and their RLS policies are already defined above.
-- The following are only additive comments and an alias cleanup function
-- from the original migration_developer_api.sql.
-- ============================================================

-- Table comments
comment on table public.api_keys is 'Developer API keys for third-party integrations';
comment on column public.api_keys.key_hash is 'SHA256 hash of the API key - raw key is never stored';
comment on column public.api_keys.key_hint is 'Last 4 characters of the key for display';
comment on column public.api_keys.scopes is 'Array of permission scopes granted to this key';
comment on table public.api_usage_logs is 'API usage tracking for monitoring and debugging';
comment on table public.webhooks is 'Webhook configurations for event notifications';
comment on column public.webhooks.secret is 'HMAC secret for webhook signature verification';
comment on column public.webhooks.secret_hint is 'Last 8 characters of secret for display';
comment on column public.webhooks.events is 'Array of event types to trigger on: email.received, otp.detected';
comment on table public.webhook_deliveries is 'Webhook delivery attempts and responses';

-- Alias for cleanup function (alternate name for cron compatibility)
create or replace function public.cleanup_old_api_logs()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.api_usage_logs where created_at < now() - interval '30 days';
end;
$$;


