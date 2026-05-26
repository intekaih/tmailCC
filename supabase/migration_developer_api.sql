-- ============================================================
-- Developer API Migration - tmailCC
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

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

comment on table public.api_keys is 'Developer API keys for third-party integrations';
comment on column public.api_keys.key_hash is 'SHA256 hash of the API key - raw key is never stored';
comment on column public.api_keys.key_hint is 'Last 4 characters of the key for display';
comment on column public.api_keys.scopes is 'Array of permission scopes granted to this key';

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

comment on table public.api_usage_logs is 'API usage tracking for monitoring and debugging';

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

comment on table public.webhooks is 'Webhook configurations for event notifications';
comment on column public.webhooks.secret is 'HMAC secret for webhook signature verification';
comment on column public.webhooks.secret_hint is 'Last 8 characters of secret for display';
comment on column public.webhooks.events is 'Array of event types to trigger on: email.received, otp.detected';

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

comment on table public.webhook_deliveries is 'Webhook delivery attempts and responses';

-- Indexes
create index if not exists webhook_deliveries_webhook_id_idx on public.webhook_deliveries (webhook_id);
create index if not exists webhook_deliveries_created_at_idx on public.webhook_deliveries (created_at desc);

-- ============================================================
-- FUNCTIONS & TRIGGERS
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

-- Auto-delete old usage logs (keeps 30 days)
create or replace function public.cleanup_old_api_logs()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.api_usage_logs where created_at < now() - interval '30 days';
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
alter table public.api_keys enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;

-- ============================================================
-- RLS POLICIES: api_keys
-- ============================================================

-- Users can view their own keys
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_select' and tablename = 'api_keys') then
    create policy "api_keys_own_select" on public.api_keys for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Users can create their own keys
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_insert' and tablename = 'api_keys') then
    create policy "api_keys_own_insert" on public.api_keys for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can update their own keys
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_update' and tablename = 'api_keys') then
    create policy "api_keys_own_update" on public.api_keys for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete their own keys
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'api_keys_own_delete' and tablename = 'api_keys') then
    create policy "api_keys_own_delete" on public.api_keys for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- RLS POLICIES: api_usage_logs
-- ============================================================

-- Users can view logs for their own keys
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

-- Users can view their own webhooks
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_select' and tablename = 'webhooks') then
    create policy "webhooks_own_select" on public.webhooks for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Users can create their own webhooks
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_insert' and tablename = 'webhooks') then
    create policy "webhooks_own_insert" on public.webhooks for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can update their own webhooks
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_update' and tablename = 'webhooks') then
    create policy "webhooks_own_update" on public.webhooks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete their own webhooks
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhooks_own_delete' and tablename = 'webhooks') then
    create policy "webhooks_own_delete" on public.webhooks for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- RLS POLICIES: webhook_deliveries
-- ============================================================

-- Users can view deliveries for their own webhooks
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'webhook_deliveries_own_select' and tablename = 'webhook_deliveries') then
    create policy "webhook_deliveries_own_select" on public.webhook_deliveries for select to authenticated using (
      exists (select 1 from public.webhooks where id = webhook_id and user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify tables were created:
-- select 'api_keys' as table_name, count(*) as count from public.api_keys
-- union all select 'api_usage_logs', count(*) from public.api_usage_logs
-- union all select 'webhooks', count(*) from public.webhooks
-- union all select 'webhook_deliveries', count(*) from public.webhook_deliveries;
