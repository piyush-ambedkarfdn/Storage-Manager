-- Phase 6: content calendar, photo protection, option rename/delete rules, "not used yet" support.
create table content_items (
  id uuid primary key default gen_random_uuid(),
  publish_date date,
  platform text,
  content_format text,
  content_pillar text,
  title text,
  content_brief text,
  caption text,
  hashtags text,
  cta text,
  goal text,
  status text not null default 'Idea',
  production_stage text not null default 'Not started',
  awareness_day text,                 -- id of a day from src/config/awareness-days.ts or a custom_days row
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on content_items (publish_date);
create index on content_items (status, production_stage);

create table content_item_photos (
  content_item_id uuid not null references content_items on delete cascade,
  photo_id uuid not null references photos on delete cascade,
  sort_order int not null default 0,
  primary key (content_item_id, photo_id)
);
create index on content_item_photos (photo_id);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger content_items_updated before update on content_items
  for each row execute function set_updated_at();

-- Dashboard summary (admin only via function, avoids exposing a view past RLS).
create or replace function calendar_summary() returns table (status text, production_stage text, platform text, total bigint)
language sql stable security definer set search_path = public as $$
  select status, production_stage, platform, count(*) from content_items
  where is_admin() group by 1,2,3
$$;

-- A photo is protected when it sits in a post whose status is marked "protects photos".
create or replace function photo_is_protected(p_photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from content_item_photos cip
    join content_items ci on ci.id = cip.content_item_id
    join calendar_options o on o.type = 'status' and o.value = ci.status
    where cip.photo_id = p_photo and o.protects_photos)
$$;

-- Photos not yet used in any post (used by the gallery filter).
create view photos_unused with (security_invoker = true) as
  select p.* from photos p
  where not exists (select 1 from content_item_photos c where c.photo_id = p.id);

-- Renaming an option updates the posts that use it.
create or replace function cascade_option_rename() returns trigger language plpgsql as $$
begin
  if new.value <> old.value then
    if new.type = 'platform' then update content_items set platform = new.value where platform = old.value;
    elsif new.type = 'format' then update content_items set content_format = new.value where content_format = old.value;
    elsif new.type = 'pillar' then update content_items set content_pillar = new.value where content_pillar = old.value;
    elsif new.type = 'goal' then update content_items set goal = new.value where goal = old.value;
    elsif new.type = 'status' then update content_items set status = new.value where status = old.value;
    elsif new.type = 'stage' then update content_items set production_stage = new.value where production_stage = old.value;
    end if;
  end if;
  return new;
end $$;
create trigger calendar_options_rename after update of value on calendar_options
  for each row execute function cascade_option_rename();

-- An option that is in use cannot be deleted; hide it instead.
create or replace function block_option_delete_if_used() returns trigger language plpgsql as $$
declare used int := 0;
begin
  if old.type = 'platform' then select count(*) into used from content_items where platform = old.value;
  elsif old.type = 'format' then select count(*) into used from content_items where content_format = old.value;
  elsif old.type = 'pillar' then select count(*) into used from content_items where content_pillar = old.value;
  elsif old.type = 'goal' then select count(*) into used from content_items where goal = old.value;
  elsif old.type = 'status' then select count(*) into used from content_items where status = old.value;
  elsif old.type = 'stage' then select count(*) into used from content_items where production_stage = old.value;
  end if;
  if used > 0 then raise exception 'Option "%" is used by % items. Hide it instead.', old.value, used; end if;
  return old;
end $$;
create trigger calendar_options_delete before delete on calendar_options
  for each row execute function block_option_delete_if_used();

-- Days the admin adds themselves (local festivals, organisation days, moving dates for one year).
-- The built-in national and international days live in code (src/config/awareness-days.ts).
create table custom_days (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_hi text,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  year int,                            -- set it for a date that moves every year
  scope text not null default 'local' check (scope in ('national','international','local')),
  tags text[] not null default '{}',
  note text,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);
-- Built-in days the admin chose to hide (list of ids).
insert into app_settings values ('hidden_days', '[]') on conflict (key) do nothing;

-- Folder counts gain the "not used yet" filter (same parameters as 0004 plus p_unused_only).
drop function if exists folder_counts(text[], date, date, text, boolean, uuid[], uuid);
create or replace function folder_counts(
  p_activity text[] default null,
  p_from date default null,
  p_to date default null,
  p_consent text default null,
  p_has_story boolean default null,
  p_themes uuid[] default null,
  p_uploader uuid default null,
  p_unused_only boolean default false
) returns table (
  program_id uuid, program text,
  district_id uuid, district text,
  panchayat_id uuid, panchayat text,
  village_id uuid, village text,
  photo_count bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.name, d.id, d.name, pa.id, pa.name, v.id, v.name, count(*)
  from photos ph
  left join field_reports r on r.id = ph.report_id
  left join programs pr on pr.id = ph.program_id
  left join districts d on d.id = ph.district_id
  left join panchayats pa on pa.id = ph.panchayat_id
  left join villages v on v.id = ph.village_id
  where is_admin()
    and ph.status = 'active'
    and (p_activity is null or ph.activity_type = any(p_activity))
    and (p_from is null or ph.event_date >= p_from)
    and (p_to is null or ph.event_date <= p_to)
    and (p_consent is null or ph.consent = p_consent)
    and (p_has_story is null or ph.has_story = p_has_story)
    and (p_themes is null or r.theme_ids && p_themes)
    and (p_uploader is null or ph.uploaded_by = p_uploader)
    and (not p_unused_only or not exists (select 1 from content_item_photos c where c.photo_id = ph.id))
  group by 1,2,3,4,5,6,7,8
  order by 2, 4, 6, 8
$$;
revoke execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid, boolean) from public, anon;
grant execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid, boolean) to authenticated;

-- Dashboard counts in one call (admin only): photos per activity type, reports per theme, library numbers.
create or replace function dashboard_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else jsonb_build_object(
    'photos_by_activity', coalesce((select jsonb_object_agg(coalesce(activity_type, 'unknown'), n)
       from (select activity_type, count(*) n from photos where status = 'active' group by 1) a), '{}'::jsonb),
    'reports_by_theme', coalesce((select jsonb_object_agg(t, n)
       from (select unnest(theme_ids) t, count(*) n from field_reports group by 1) b), '{}'::jsonb),
    'uploads_this_week', (select count(*) from photos where status = 'active' and created_at >= now() - interval '7 days'),
    'photos_total', (select count(*) from photos where status = 'active'),
    'photos_unused', (select count(*) from photos p where p.status = 'active'
       and not exists (select 1 from content_item_photos c where c.photo_id = p.id)),
    'names_pending', (select count(*) from blocks where not approved) + (select count(*) from panchayats where not approved)
       + (select count(*) from villages where not approved)
  ) end
$$;
revoke execute on function dashboard_counts() from public, anon;
grant execute on function dashboard_counts() to authenticated;

alter table content_items enable row level security;
alter table content_item_photos enable row level security;
alter table custom_days enable row level security;
create policy custom_days_admin on custom_days for all using (is_admin()) with check (is_admin());
create policy content_admin on content_items for all using (is_admin()) with check (is_admin());
create policy content_photos_admin on content_item_photos for all using (is_admin()) with check (is_admin());
