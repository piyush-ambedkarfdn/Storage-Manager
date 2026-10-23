-- Calendar import from Excel/CSV. The original file is kept in the active storage (R2 or Google Drive);
-- this table remembers where, and every imported post points back to its import.

create table calendar_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_provider text not null check (storage_provider in ('r2','gdrive')),
  storage_key text not null,
  size_bytes bigint not null default 0,
  rows_in_file int not null default 0,
  rows_imported int not null default 0,
  rows_skipped int not null default 0,
  options_added int not null default 0,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table calendar_imports enable row level security;
create policy calendar_imports_admin_read on calendar_imports for select using (is_admin());

alter table content_items add column import_id uuid references calendar_imports on delete set null;
create index on content_items (import_id);

-- Import files count towards the storage meters (photos are still counted as before).
create or replace function storage_usage() returns table (
  provider text, used_bytes bigint, active_count bigint, trashed_count bigint, archived_count bigint)
language sql stable security definer set search_path = public as $$
  with ph as (
    select
      p.storage_provider as provider,
      coalesce(sum(p.size_bytes + coalesce(p.thumb_size_bytes,0)) filter (where p.status in ('active','trashed')),0)
      + coalesce(sum(coalesce(p.thumb_size_bytes,0)) filter (where p.status = 'archived'),0) as used_bytes,
      count(*) filter (where p.status = 'active') as active_count,
      count(*) filter (where p.status = 'trashed') as trashed_count,
      count(*) filter (where p.status = 'archived') as archived_count
    from photos p group by p.storage_provider
  ), im as (
    select storage_provider as provider, sum(size_bytes) as bytes from calendar_imports group by 1
  )
  select coalesce(ph.provider, im.provider)::text,
         (coalesce(ph.used_bytes,0) + coalesce(im.bytes,0))::bigint,
         coalesce(ph.active_count,0)::bigint, coalesce(ph.trashed_count,0)::bigint, coalesce(ph.archived_count,0)::bigint
  from ph full join im on im.provider = ph.provider
  where is_active_user()
$$;

-- One transaction: record the import, add unknown dropdown values (optional), insert the posts.
-- Values are matched to existing options ignoring capital letters. A value that is still unknown
-- (when adding is off) is dropped; status and stage then fall back to their defaults.
create or replace function calendar_import(
  p_rows jsonb,
  p_file jsonb,
  p_add_options boolean default true,
  p_skip_duplicates boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_import uuid;
  v_total int;
  v_inserted int := 0;
  v_opts int := 0;
begin
  if not is_admin() then raise exception 'Only admins can import.' using errcode = '42501'; end if;
  v_total := coalesce(jsonb_array_length(p_rows), 0);
  if v_total = 0 then raise exception 'There are no rows to import.'; end if;
  if v_total > 2000 then raise exception 'Import at most 2000 rows at a time.'; end if;

  insert into calendar_imports (file_name, storage_provider, storage_key, size_bytes, rows_in_file, created_by)
  values (p_file->>'file_name', p_file->>'storage_provider', p_file->>'storage_key',
          coalesce((p_file->>'size_bytes')::bigint, 0), v_total, auth.uid())
  returning id into v_import;

  if p_add_options then
    insert into calendar_options (type, value, sort_order)
    select x.t, min(x.v),
           coalesce((select max(o.sort_order) from calendar_options o where o.type = x.t), 0)
             + row_number() over (partition by x.t order by min(x.n))
    from (
      select 'platform' t, nullif(trim(r.platform), '') v, r.n from jsonb_to_recordset(p_rows) as r(n int, platform text)
      union all select 'format', nullif(trim(r.content_format), ''), r.n from jsonb_to_recordset(p_rows) as r(n int, content_format text)
      union all select 'pillar', nullif(trim(r.content_pillar), ''), r.n from jsonb_to_recordset(p_rows) as r(n int, content_pillar text)
      union all select 'goal', nullif(trim(r.goal), ''), r.n from jsonb_to_recordset(p_rows) as r(n int, goal text)
      union all select 'status', nullif(trim(r.status), ''), r.n from jsonb_to_recordset(p_rows) as r(n int, status text)
      union all select 'stage', nullif(trim(r.production_stage), ''), r.n from jsonb_to_recordset(p_rows) as r(n int, production_stage text)
    ) x
    where x.v is not null
      and not exists (select 1 from calendar_options o where o.type = x.t and lower(o.value) = lower(x.v))
    group by x.t, lower(x.v);
    get diagnostics v_opts = row_count;
  end if;

  with src as (
    select
      r.n,
      nullif(r.publish_date, '')::date as publish_date,
      (select o.value from calendar_options o where o.type = 'platform' and lower(o.value) = lower(trim(r.platform))) as platform,
      (select o.value from calendar_options o where o.type = 'format' and lower(o.value) = lower(trim(r.content_format))) as content_format,
      (select o.value from calendar_options o where o.type = 'pillar' and lower(o.value) = lower(trim(r.content_pillar))) as content_pillar,
      nullif(trim(r.title), '') as title,
      nullif(trim(r.content_brief), '') as content_brief,
      nullif(trim(r.caption), '') as caption,
      nullif(trim(r.hashtags), '') as hashtags,
      nullif(trim(r.cta), '') as cta,
      (select o.value from calendar_options o where o.type = 'goal' and lower(o.value) = lower(trim(r.goal))) as goal,
      coalesce((select o.value from calendar_options o where o.type = 'status' and lower(o.value) = lower(trim(r.status))), 'Idea') as status,
      coalesce((select o.value from calendar_options o where o.type = 'stage' and lower(o.value) = lower(trim(r.production_stage))), 'Not started') as production_stage
    from jsonb_to_recordset(p_rows) as r(
      n int, publish_date text, platform text, content_format text, content_pillar text, title text,
      content_brief text, caption text, hashtags text, cta text, goal text, status text, production_stage text)
  ), ins as (
    insert into content_items (publish_date, platform, content_format, content_pillar, title, content_brief,
                               caption, hashtags, cta, goal, status, production_stage, created_by, import_id)
    select s.publish_date, s.platform, s.content_format, s.content_pillar, s.title, s.content_brief,
           s.caption, s.hashtags, s.cta, s.goal, s.status, s.production_stage, auth.uid(), v_import
    from src s
    where s.title is not null
      and (not p_skip_duplicates or not exists (
            select 1 from content_items c
            where c.publish_date is not distinct from s.publish_date
              and c.platform is not distinct from s.platform
              and lower(coalesce(c.title, '')) = lower(s.title)))
    order by s.n
    returning 1
  )
  select count(*) into v_inserted from ins;

  update calendar_imports
     set rows_imported = v_inserted, rows_skipped = v_total - v_inserted, options_added = v_opts
   where id = v_import;

  return jsonb_build_object('import_id', v_import, 'total', v_total, 'imported', v_inserted,
                            'skipped', v_total - v_inserted, 'options_added', v_opts);
end $$;
revoke execute on function calendar_import(jsonb, jsonb, boolean, boolean) from public, anon;
grant execute on function calendar_import(jsonb, jsonb, boolean, boolean) to authenticated;
