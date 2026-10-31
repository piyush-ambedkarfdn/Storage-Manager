-- Activity types and upload-form questions per program.
-- * An activity type can belong to one program (program_id). A program that has types of its own offers only those in
--   step 1 of the upload; a program without any offers the general types (program_id empty), as before.
-- * program_form_config says which report questions and whether problem themes a program's upload form asks.
-- * GOONJ gets its 14 "Type of Activity in CFW initiative" types here (moved out of step 2); Meeting/Workshop gets
--   Governance, Finance and Other workshops, with no report questions and no themes.
-- Safe to run more than once.

-- 1. activity types per program
alter table activity_types add column if not exists program_id uuid references programs on delete cascade;
alter table activity_types drop constraint if exists activity_types_label_key;
create unique index if not exists activity_types_scope_label_idx
  on activity_types (coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(label));
create index if not exists activity_types_program_idx on activity_types (program_id) where program_id is not null;

-- 2. which questions each program's upload form asks (no row = the full form, as before)
create table if not exists program_form_config (
  program_id uuid primary key references programs on delete cascade,
  report_parts text[] not null default '{what_happened,problem,who_affected,result}'
    check (report_parts <@ array['what_happened','problem','who_affected','result']),
  ask_themes boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table program_form_config enable row level security;
drop policy if exists program_form_config_read on program_form_config;
create policy program_form_config_read on program_form_config for select using (is_active_user());
drop policy if exists program_form_config_admin on program_form_config;
create policy program_form_config_admin on program_form_config for all using (is_admin()) with check (is_admin());

-- 3. GOONJ: the CFW activities become its activity types
do $$
declare
  pid uuid; pslug text; fid uuid; i int;
  names text[] := array['Bridge Making','Bamboo Bench Making','Canal Cleaning','Chabutra Making','Changing Room Making',
    'Checkdam Making','Community Hall Making','Kitchen Garden','Pond Cleaning','Road Repairing','School Boundary',
    'Soakpit Making','Well Surrounding Cleaning','Dobha Repairing'];
  colors text[] := array['#3B7DD8','#2E9E6B','#1F9CB0','#D99A1E','#8B63D9','#D2543C','#B5651D','#4C9F38','#0E7C86','#C26A9B','#7A8AA3','#E07B39','#5B6EE1','#9A7B4F'];
begin
  select id, coalesce(nullif(slug, ''), 'goonj') into pid, pslug from programs where lower(trim(name)) = 'goonj' limit 1;
  if pid is null then
    raise notice 'Program GOONJ was not found, so its activity types were not added. Add them in Settings > Programs.';
  else
    for i in 1 .. array_length(names, 1) loop
      insert into activity_types (id, label, color, sort_order, program_id)
      values (left(pslug || '-' || trim(both '-' from regexp_replace(lower(names[i]), '[^a-z0-9]+', '-', 'g')), 40), names[i], colors[i], i, pid)
      on conflict do nothing;
    end loop;
    select id into fid from program_fields where program_id = pid and label = 'Type of Activity in CFW initiative' limit 1;
    if fid is not null then
      -- photos already uploaded with a CFW activity get the matching activity type; step 2 no longer asks for it
      update photos p set activity_type = a.id
        from photo_field_values v
        join program_field_options o on o.id = v.option_id
        join activity_types a on a.program_id = pid and lower(a.label) = lower(o.value)
       where v.photo_id = p.id and v.field_id = fid and p.program_id = pid;
      update program_fields set hidden = true where id = fid;
    end if;
  end if;
end $$;

-- 4. Meeting/Workshop: its own activity types, and a form without report questions or problem themes
do $$
declare pid uuid; pslug text; i int;
  names text[] := array['Governance','Finance','Other workshops'];
  colors text[] := array['#8B63D9','#D99A1E','#3B7DD8'];
begin
  select id, coalesce(nullif(slug, ''), 'meeting') into pid, pslug from programs
   where lower(name) like '%meeting%' or lower(name) like '%workshop%' order by name limit 1;
  if pid is null then
    raise notice 'No Meeting/Workshop program was found, so nothing was added for it. Add the program, then set it up in Settings > Programs.';
  else
    for i in 1 .. array_length(names, 1) loop
      insert into activity_types (id, label, color, sort_order, program_id)
      values (left(pslug || '-' || trim(both '-' from regexp_replace(lower(names[i]), '[^a-z0-9]+', '-', 'g')), 40), names[i], colors[i], i, pid)
      on conflict do nothing;
    end loop;
    insert into program_form_config (program_id, report_parts, ask_themes) values (pid, '{}', false)
    on conflict (program_id) do nothing;
  end if;
end $$;

-- 5. Program tab: Staff > Village > Activity type (the photo's activity type, now different for each program)
drop function if exists program_tree(uuid, uuid);
create or replace function program_tree(p_program uuid) returns table (
  staff_id uuid, staff text,
  district_id uuid, district text,
  panchayat_id uuid, panchayat text,
  village_id uuid, village text,
  activity_id text, activity_name text, activity_name_hi text, activity_color text, activity_sort int,
  photo_count bigint)
language sql stable security definer set search_path = public as $$
  select ph.uploaded_by, pf.full_name,
         ph.district_id, d.name, ph.panchayat_id, pa.name, ph.village_id, v.name,
         a.id, a.label, a.label_hi, a.color, a.sort_order,
         count(*)
  from photos ph
  left join profiles pf on pf.id = ph.uploaded_by
  left join districts d on d.id = ph.district_id
  left join panchayats pa on pa.id = ph.panchayat_id
  left join villages v on v.id = ph.village_id
  left join activity_types a on a.id = ph.activity_type
  where is_admin() and ph.status = 'active' and ph.program_id = p_program
  group by 1,2,3,4,5,6,7,8,9,10,11,12,13
  order by 2, 4, 6, 8, 13, 10
$$;
revoke execute on function program_tree(uuid) from public, anon;
grant execute on function program_tree(uuid) to authenticated;
