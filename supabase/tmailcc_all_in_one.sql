-- ============================================================
-- tmailCC - Database Schema, Storage & Sample Seed Data
-- ============================================================
-- Chạy toàn bộ script này trong Supabase Dashboard > SQL Editor
-- để thiết lập cấu trúc cơ sở dữ liệu hoàn chỉnh cho dự án.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. TABLES CREATION
-- ============================================================

-- PROFILES (Bảng thông tin người dùng bổ trợ cho auth.users)
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
  avatar_url text,
  preferences jsonb not null default '{"darkMode":null,"soundEnabled":true,"notificationsEnabled":true}'
);

comment on table public.profiles is 'User profiles - extends auth.users';

-- DOMAINS (Các tên miền khả dụng cho hệ thống tạo mail)
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

-- EMAIL ACCOUNTS (Tài khoản email tạm thời hoặc thuộc người dùng đăng nhập)
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

-- EMAILS (Bảng lưu các email được nhận vào hệ thống)
create table if not exists public.emails (
  id uuid not null default gen_random_uuid() primary key,
  account_id uuid not null references public.accounts on delete cascade,
  user_id uuid references auth.users on delete cascade,
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

-- CONFIG (Cấu hình hệ thống lưu trữ dưới dạng key-value)
create table if not exists public.config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.config is 'System configuration key-value store';

-- IP BLOCKLIST (Danh sách IP bị chặn truy cập)
create table if not exists public.ip_blocklist (
  ip text primary key,
  reason text not null default '',
  blocked_by uuid references auth.users on delete set null,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table public.ip_blocklist is 'Blocked IP addresses';

-- OTP ACCESS KEYS (Mã khóa để chia sẻ hộp thư / lấy OTP nhanh)
create table if not exists public.otp_keys (
  address text primary key,
  access_key text,
  access_key_hash text,
  note text default '',
  created_at timestamptz not null default now()
);

comment on table public.otp_keys is 'OTP page access keys';

-- API KEYS (Mã token API cho lập trình viên tích hợp)
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

comment on table public.api_keys is 'Developer API keys for integrations';

-- API USAGE LOGS (Nhật ký gọi API phục vụ phân tích / giám sát)
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

comment on table public.api_usage_logs is 'API usage tracking';

-- WEBHOOKS (Đăng ký Webhook gửi thông báo sự kiện)
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

comment on table public.webhooks is 'Webhook configurations';

-- WEBHOOK DELIVERIES (Nhật ký và trạng thái gửi webhook)
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

comment on table public.webhook_deliveries is 'Webhook delivery attempts';

-- RATE LIMITS (Quản lý giới hạn tần suất yêu cầu)
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_email_idx on public.profiles (email) where email != '';
create index if not exists domains_domain_idx on public.domains (domain);
create index if not exists domains_is_active_idx on public.domains (is_active);
create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists accounts_address_idx on public.accounts (address);
create index if not exists emails_account_id_idx on public.emails (account_id);
create index if not exists emails_account_received_idx on public.emails (account_id, received_at desc);
create index if not exists emails_content_hash_idx on public.emails (account_id, content_hash) where content_hash is not null;
create unique index if not exists emails_message_id_unique on public.emails (message_id) where message_id is not null;
create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
create index if not exists api_usage_logs_api_key_id_idx on public.api_usage_logs (api_key_id);
create index if not exists api_usage_logs_created_at_idx on public.api_usage_logs (created_at desc);
create index if not exists webhooks_user_id_idx on public.webhooks (user_id);
create index if not exists webhooks_is_active_idx on public.webhooks (is_active);
create index if not exists webhook_deliveries_webhook_id_idx on public.webhook_deliveries (webhook_id);
create index if not exists webhook_deliveries_created_at_idx on public.webhook_deliveries (created_at desc);
create index if not exists idx_rate_limits_reset_at on public.rate_limits (reset_at);

-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- Tự động đồng bộ user_id từ accounts sang emails khi chèn email mới
create or replace function public.populate_email_user_id()
returns trigger as $$
begin
  select user_id into new.user_id
  from public.accounts
  where id = new.account_id;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists trigger_populate_email_user_id on public.emails;
create trigger trigger_populate_email_user_id
  before insert on public.emails
  for each row execute function public.populate_email_user_id();

-- Tự động tạo hồ sơ profile khi người dùng đăng ký tài khoản qua Auth
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
  insert into public.profiles (id, username, email, role)
  values (new.id, v_username, coalesce(new.email, ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Lưu thời gian đăng nhập gần nhất
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

-- Cập nhật timestamp cho thay đổi config
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

-- Cập nhật timestamp cho thay đổi webhooks
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

-- Tăng/giảm số lượng email thống kê
create or replace function public.increment_email_count(user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = email_count + 1
  where id = user_id;
end;
$$;

create or replace function public.decrement_email_count(user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = greatest(0, email_count - 1)
  where id = user_id;
end;
$$;

create or replace function public.decrement_email_count_by(user_id uuid, count integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email_count = greatest(0, email_count - count)
  where id = user_id;
end;
$$;

-- Tự động dọn dẹp nhật ký sử dụng cũ (giữ lại 30 ngày)
create or replace function public.cleanup_old_api_logs()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.api_usage_logs where created_at < now() - interval '30 days';
end;
$$;

-- Hàm thực hiện tăng tần suất rate limit nguyên tử (Atomic Rate Limiter)
create or replace function public.rate_limit_incr(
  p_key text,
  p_ttl_seconds integer
)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_now timestamptz := now();
  v_reset_at timestamptz := now() + (p_ttl_seconds || ' seconds')::interval;
begin
  update public.rate_limits
  set count = count + 1
  where key = p_key and reset_at > v_now
  returning count into v_count;

  if found then
    return v_count;
  end if;

  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_reset_at)
  on conflict (key) do update
  set count = 1, reset_at = v_reset_at
  returning count into v_count;

  return v_count;
end;
$$;

-- ============================================================
-- 5. STORAGE STRUCTURE (Tạo buckets lưu trữ cho attachments & avatars)
-- ============================================================

-- Thêm cấu hình buckets trong schema của storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Hàm tạo đường dẫn an toàn cho tệp tin đính kèm
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
-- 6. ROW LEVEL SECURITY & POLICIES
-- ============================================================

-- Kích hoạt RLS cho toàn bộ các bảng trong schema public & storage.objects
alter table public.profiles enable row level security;
alter table public.domains enable row level security;
alter table public.accounts enable row level security;
alter table public.emails enable row level security;
alter table public.config enable row level security;
alter table public.ip_blocklist enable row level security;
alter table public.otp_keys enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.rate_limits enable row level security;
alter table storage.objects enable row level security;

-- --- 6.1 POLICIES: profiles ---
create policy "profiles_view_own_or_admin" on public.profiles for select to authenticated
  using (auth.uid() = id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "profiles_update_own" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- --- 6.2 POLICIES: domains ---
create policy "domains_view_active" on public.domains for select to anon, authenticated
  using (is_active = true);

create policy "domains_admin_all" on public.domains for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- --- 6.3 POLICIES: accounts ---
create policy "accounts_view_own" on public.accounts for select to authenticated
  using (auth.uid() = user_id);

create policy "accounts_insert_own" on public.accounts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "accounts_delete_own" on public.accounts for delete to authenticated
  using (auth.uid() = user_id);

create policy "accounts_view_admin" on public.accounts for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "accounts_delete_admin" on public.accounts for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Cho phép xem các tài khoản không thuộc user nào (guest accounts) để hỗ trợ realtime subscriptions
create policy "accounts_select_anon_safe" on public.accounts for select to anon, authenticated
  using (user_id is null);

-- --- 6.4 POLICIES: emails (Được tối ưu hóa không chứa subquery để chạy mượt realtime) ---
create policy "emails_view_own" on public.emails for select to authenticated
  using (auth.uid() = user_id);

create policy "emails_delete_own" on public.emails for delete to authenticated
  using (auth.uid() = user_id);

create policy "emails_view_admin" on public.emails for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "emails_delete_admin" on public.emails for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Chặn hoàn toàn quyền đọc của vai trò ẩn danh trên tất cả các email để bảo vệ thông tin
create policy "emails_select_anon_blocked" on public.emails for select to anon
  using (false);

-- --- 6.5 POLICIES: config ---
create policy "config_admin_view" on public.config for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "config_admin_update" on public.config for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- --- 6.6 POLICIES: ip_blocklist ---
create policy "ip_blocklist_admin_view" on public.ip_blocklist for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "ip_blocklist_admin_all" on public.ip_blocklist for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- --- 6.7 POLICIES: api_keys ---
create policy "api_keys_own_select" on public.api_keys for select to authenticated using (auth.uid() = user_id);
create policy "api_keys_own_insert" on public.api_keys for insert to authenticated with check (auth.uid() = user_id);
create policy "api_keys_own_update" on public.api_keys for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "api_keys_own_delete" on public.api_keys for delete to authenticated using (auth.uid() = user_id);

-- --- 6.8 POLICIES: api_usage_logs ---
create policy "api_usage_logs_own_select" on public.api_usage_logs for select to authenticated 
  using (exists (select 1 from public.api_keys where id = api_key_id and user_id = auth.uid()));

-- --- 6.9 POLICIES: webhooks ---
create policy "webhooks_own_select" on public.webhooks for select to authenticated using (auth.uid() = user_id);
create policy "webhooks_own_insert" on public.webhooks for insert to authenticated with check (auth.uid() = user_id);
create policy "webhooks_own_update" on public.webhooks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "webhooks_own_delete" on public.webhooks for delete to authenticated using (auth.uid() = user_id);

-- --- 6.10 POLICIES: webhook_deliveries ---
create policy "webhook_deliveries_own_select" on public.webhook_deliveries for select to authenticated 
  using (exists (select 1 from public.webhooks where id = webhook_id and user_id = auth.uid()));

-- --- 6.11 POLICIES: storage.objects (attachments) ---
create policy "attachments_view_public" on storage.objects for select to authenticated, anon using (bucket_id = 'attachments');
create policy "attachments_insert_authenticated" on storage.objects for insert to authenticated with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments_admin_all" on storage.objects for all to authenticated using (bucket_id = 'attachments' and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- --- 6.12 POLICIES: storage.objects (avatars) ---
create policy "avatars_view_public" on storage.objects for select to authenticated, anon using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 7. DEFAULT SYSTEM SEED DATA (Dữ liệu cấu hình & Tên miền mặc định)
-- ============================================================

-- Thêm các tham số cấu hình mặc định
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

-- Thêm các tên miền mặc định để khởi tạo ứng dụng
insert into public.domains (domain, label, is_default, is_active) values
  ('tmailcc.app', 'Tên miền chính thức', true, true),
  ('shopcc.app', 'Tên miền cửa hàng', false, true),
  ('mangacc.app', 'Tên miền truyện tranh', false, true)
on conflict (domain) do nothing;

-- ============================================================
-- 8. MOCK / SAMPLE DATA FOR GUEST (Tạo tài khoản và thư mẫu kiểm thử)
-- ============================================================

-- 8.1 Tạo tài khoản email khách mẫu
insert into public.accounts (id, address, local_part, domain, user_id, guest_owner_token_hash, email_count)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  'welcome@tmailcc.app',
  'welcome',
  'tmailcc.app',
  null, -- guest account
  null,
  2
)
on conflict (address) do nothing;

-- 8.2 Tạo email mẫu 1: Chào mừng sử dụng tmailCC
insert into public.emails (
  id,
  account_id,
  user_id,
  from_address,
  from_name,
  to_address,
  subject,
  text_content,
  html_content,
  received_at,
  is_read
) values (
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  null,
  'system@tmailcc.app',
  'Hệ thống tmailCC',
  'welcome@tmailcc.app',
  'Chào mừng bạn đến với tmailCC - Hộp thư tạm thời thông minh 🚀',
  'Chào mừng bạn đã thiết lập và deploy thành công dự án tmailCC lên VPS. Hệ thống của bạn đã sẵn sàng nhận email.',
  '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;"><h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Chào mừng tới tmailCC!</h2><p>Xin chúc mừng! Bạn đã hoàn thành việc deploy dự án lên VPS thành công với tên miền <strong>tmailcc.app</strong>.</p><p>Hộp thư tạm thời của bạn hiện đã trực tuyến và sẵn sàng tiếp nhận các thông điệp. Bạn có thể sử dụng các chức năng sau:</p><ul><li>Tự động nhận thư mới theo thời gian thực (Realtime).</li><li>Quản lý danh sách tên miền tùy biến trong phần Admin.</li><li>Tạo mã OTP hoặc mã API token phục vụ tích hợp bên thứ ba.</li></ul><p style="background: #f3f4f6; padding: 10px; border-left: 4px solid #ea580c;">Đây là thư mẫu tự động được tạo sẵn trong hệ thống database để kiểm thử tính năng hiển thị.</p><p>Trân trọng,<br><strong>Đội ngũ tmailCC</strong></p></div></body></html>',
  now(),
  false
)
on conflict (id) do nothing;

-- 8.3 Tạo email mẫu 2: Hướng dẫn tích hợp API
insert into public.emails (
  id,
  account_id,
  user_id,
  from_address,
  from_name,
  to_address,
  subject,
  text_content,
  html_content,
  received_at,
  is_read
) values (
  'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  null,
  'developer@tmailcc.app',
  'Bộ phận Tích hợp API',
  'welcome@tmailcc.app',
  'Hướng dẫn sử dụng Developer API & Webhooks',
  'Sử dụng API Key để kết nối công cụ bên thứ ba với hệ thống email của bạn. Nhận webhook khi có thư mới.',
  '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;"><h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Developer API & Webhooks</h2><p>Hệ thống tmailCC hỗ trợ kết nối lập trình rất mạnh mẽ. Dưới đây là các bước cơ bản để bắt đầu:</p><ol><li><strong>Tạo API Key</strong>: Truy cập tab API Key trên thanh Menu giao diện chính để tạo mới mã token.</li><li><strong>Cấu hình Webhook</strong>: Thêm URL nhận thông tin để nhận phản hồi sự kiện <code>email.received</code> khi có thư gửi đến.</li><li><strong>Truy xuất hòm thư</strong>: Gửi request HTTP GET tới <code>/api/v1/accounts/[address]/emails</code> để lấy danh sách email.</li></ol><p>Tài liệu đầy đủ về các API Endpoint được lưu trữ chi tiết tại mục tài liệu hướng dẫn trong mã nguồn.</p><p>Chúc bạn tích hợp thành công,<br><strong>tmailCC DevTeam</strong></p></div></body></html>',
  now() - interval '5 minutes',
  false
)
on conflict (id) do nothing;
