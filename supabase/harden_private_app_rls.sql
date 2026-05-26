-- Harden TMail for private-app mode.
-- Apply this once on existing Supabase projects after deploying the server changes.

-- Profiles should not be readable by anonymous clients.
drop policy if exists "profiles_view_all" on public.profiles;
drop policy if exists "profiles_view_own_or_admin" on public.profiles;
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

-- Config may contain private operational values, so keep it admin-only.
drop policy if exists "config_view_all" on public.config;
drop policy if exists "config_admin_view" on public.config;
create policy "config_admin_view"
  on public.config for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
