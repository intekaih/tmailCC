-- ============================================================
-- Gmail Dotmail Management - Migration
-- ============================================================
-- Chạy script này trong Supabase Dashboard > SQL Editor
-- hoặc qua run_migration.js
-- ============================================================

-- ============================================================
-- GMAIL PARENT ACCOUNTS
-- ============================================================
create table if not exists public.gmail_parents (
  id uuid not null default gen_random_uuid() primary key,
  address text unique not null,
  app_password text not null,
  created_at timestamptz not null default now()
);

comment on table public.gmail_parents is 'Parent Gmail accounts for dotmail generation and IMAP OTP polling';

create index if not exists gmail_parents_address_idx on public.gmail_parents (address);

-- ============================================================
-- GMAIL DOTMAIL VARIANTS
-- Chỉ lưu thông tin dotmail address, không có thông tin dịch vụ.
-- Các tool bên ngoài (gpt-reg-tool, v.v.) tự quản lý trạng thái.
-- ============================================================
create table if not exists public.gmail_dotmails (
  id uuid not null default gen_random_uuid() primary key,
  parent_id uuid not null references public.gmail_parents(id) on delete cascade,
  address text unique not null,
  created_at timestamptz not null default now()
);

comment on table public.gmail_dotmails is 'Generated single-dot dotmail variants linked to parent Gmail accounts';

create index if not exists gmail_dotmails_parent_id_idx on public.gmail_dotmails (parent_id);
create index if not exists gmail_dotmails_address_idx on public.gmail_dotmails (address);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.gmail_parents enable row level security;
alter table public.gmail_dotmails enable row level security;

-- Admin-only access for gmail_parents
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'gmail_parents_admin_all' and tablename = 'gmail_parents') then
    create policy "gmail_parents_admin_all"
      on public.gmail_parents for all
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

-- Admin-only access for gmail_dotmails
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'gmail_dotmails_admin_all' and tablename = 'gmail_dotmails') then
    create policy "gmail_dotmails_admin_all"
      on public.gmail_dotmails for all
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
-- DROP MIGRATION: Xóa các cột GPT cũ nếu tồn tại
-- Chạy đoạn này nếu đã có bảng cũ chứa cột GPT
-- ============================================================
alter table public.gmail_dotmails drop column if exists status;
alter table public.gmail_dotmails drop column if exists gpt_password;
alter table public.gmail_dotmails drop column if exists gpt_name;
alter table public.gmail_dotmails drop column if exists gpt_age;
alter table public.gmail_dotmails drop column if exists error_message;
drop index if exists gmail_dotmails_status_idx;
