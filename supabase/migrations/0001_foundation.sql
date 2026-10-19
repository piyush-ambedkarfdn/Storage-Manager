-- Phase 1: foundation. Extensions, name normaliser, profiles, roles, settings, activity log.
create extension if not exists pg_trgm;
create extension if not exists fuzzystrmatch;

-- Single source of truth for spelling normalisation (used by phase 3 name matching).
create or replace function norm_name(t text) returns text
language sql immutable as $$
  select regexp_replace(
           translate(
             replace(
               regexp_replace(lower(trim(t)), '[^a-z0-9\u0900-\u097F ]', '', 'g'),
               'chh', 'ch'),
             'w', 'v'),
           '(.)\1+', '\1', 'g')
$$;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  login_id text unique,
  role text not null default 'uploader' check (role in ('admin','uploader')),
  active boolean not null default true,
  must_change_password boolean not null default true,
  assigned_district_ids uuid[],
  assigned_program_ids uuid[],
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active)
$$;
create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

-- Own last-seen timestamp (called by middleware, throttled in app code).
create or replace function touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now() where id = auth.uid()
$$;

-- Called by a user right after they chose a new password. Only touches their own row.
create or replace function clear_must_change_password() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid()
$$;
revoke execute on function touch_last_seen() from public, anon;
revoke execute on function clear_must_change_password() from public, anon;
grant execute on function touch_last_seen() to authenticated;
grant execute on function clear_must_change_password() to authenticated;

-- The last active admin can never be demoted, deactivated or deleted.
create or replace function guard_last_admin() returns trigger
language plpgsql as $$
begin
  if old.role = 'admin' and old.active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active)
     and not exists (select 1 from profiles where role = 'admin' and active and id <> old.id) then
    raise exception 'The last active admin cannot be removed, demoted or deactivated';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger profiles_last_admin before update or delete on profiles
  for each row execute function guard_last_admin();

create table app_settings (key text primary key, value jsonb not null);
insert into app_settings values
  ('storage', '{"limit_bytes":10000000000,"warn_pct":70,"amber_pct":85,"block_pct":95,"trash_days":30}');

create table activity_log (
  id bigint generated always as identity primary key,
  actor uuid references profiles on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index on activity_log (actor, created_at desc);
create index on activity_log (action, created_at desc);

alter table profiles enable row level security;
alter table app_settings enable row level security;
alter table activity_log enable row level security;

create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin on profiles for all using (is_admin()) with check (is_admin());
create policy settings_read on app_settings for select using (is_active_user());
create policy settings_admin on app_settings for all using (is_admin()) with check (is_admin());
create policy activity_insert on activity_log for insert with check (is_active_user() and actor = auth.uid());
create policy activity_admin_read on activity_log for select using (is_admin());
