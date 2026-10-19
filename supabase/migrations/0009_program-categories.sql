-- Program categories (added after phase 10). Each program can have its own ways to sort photos,
-- e.g. GOONJ → "Stage": Before, During, After, Distribution, Meeting. Admins define them in Settings > Programs;
-- staff pick them while uploading (for the whole batch, changeable per photo).

create table program_fields (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs on delete cascade,
  label text not null,
  label_hi text,
  multiple boolean not null default false,  -- false: pick one; true: pick several
  required boolean not null default false,  -- staff must pick before uploading
  sort_order int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (program_id, label)
);

create table program_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references program_fields on delete cascade,
  value text not null,
  value_hi text,
  color text,
  sort_order int not null default 0,
  hidden boolean not null default false,
  unique (field_id, value)
);

-- The chosen options of each photo. An option in use cannot be deleted (hide it instead).
create table photo_field_values (
  photo_id uuid not null references photos on delete cascade,
  field_id uuid not null references program_fields on delete cascade,
  option_id uuid not null references program_field_options on delete restrict,
  primary key (photo_id, option_id)
);
create index on photo_field_values (option_id);
create index on photo_field_values (field_id);

-- Copy of the chosen option ids on the photo itself, so the gallery can filter without joins.
alter table photos add column category_option_ids uuid[] not null default '{}';
create index photos_category_options_idx on photos using gin (category_option_ids);

-- A value must belong to its field, and the field to the photo's program; a single-choice field takes one value.
create or replace function check_photo_field_value() returns trigger
language plpgsql security definer set search_path = public as $$
declare f program_fields; o program_field_options; p_program uuid;
begin
  select * into o from program_field_options where id = new.option_id;
  if o.id is null or o.field_id <> new.field_id then raise exception 'This option does not belong to that category.'; end if;
  select * into f from program_fields where id = new.field_id;
  select program_id into p_program from photos where id = new.photo_id;
  if f.program_id is distinct from p_program then raise exception 'This category belongs to another program.'; end if;
  if not f.multiple and exists (select 1 from photo_field_values v where v.photo_id = new.photo_id and v.field_id = new.field_id and v.option_id <> new.option_id) then
    raise exception 'Only one choice is allowed for %.', f.label;
  end if;
  return new;
end $$;
create trigger photo_field_values_check before insert on photo_field_values for each row execute function check_photo_field_value();

create or replace function sync_photo_categories() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.photo_id, old.photo_id);
begin
  update photos set category_option_ids = coalesce((select array_agg(option_id order by option_id) from photo_field_values where photo_id = pid), '{}')
   where id = pid;
  return null;
end $$;
create trigger photo_field_values_sync after insert or delete on photo_field_values for each row execute function sync_photo_categories();

-- When a photo moves to another program, its categories from the old program no longer apply.
create or replace function drop_foreign_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.program_id is distinct from old.program_id then
    delete from photo_field_values v using program_fields f
     where v.photo_id = new.id and f.id = v.field_id and f.program_id is distinct from new.program_id;
  end if;
  return null;
end $$;
create trigger photos_program_change after update of program_id on photos for each row execute function drop_foreign_categories();

-- photos_unused selected p.* when it was created; recreate it so it includes the new column.
create or replace view photos_unused with (security_invoker = true) as
  select p.* from photos p
  where not exists (select 1 from content_item_photos c where c.photo_id = p.id);

-- Folder counts also honour the category filter.
drop function if exists folder_counts(text[], date, date, text, boolean, uuid[], uuid, boolean);
create or replace function folder_counts(
  p_activity text[] default null,
  p_from date default null,
  p_to date default null,
  p_consent text default null,
  p_has_story boolean default null,
  p_themes uuid[] default null,
  p_uploader uuid default null,
  p_unused_only boolean default false,
  p_categories uuid[] default null
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
    and (p_categories is null or ph.category_option_ids && p_categories)
  group by 1,2,3,4,5,6,7,8
  order by 2, 4, 6, 8
$$;
revoke execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid, boolean, uuid[]) from public, anon;
grant execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid, boolean, uuid[]) to authenticated;

alter table program_fields enable row level security;
alter table program_field_options enable row level security;
alter table photo_field_values enable row level security;

create policy program_fields_read on program_fields for select using (is_active_user());
create policy program_fields_admin on program_fields for all using (is_admin()) with check (is_admin());
create policy program_field_options_read on program_field_options for select using (is_active_user());
create policy program_field_options_admin on program_field_options for all using (is_admin()) with check (is_admin());

-- Staff can add categories to their own photos (at upload); admins can do everything.
create policy pfv_read on photo_field_values for select using (
  is_admin() or exists (select 1 from photos p where p.id = photo_id and p.uploaded_by = auth.uid()));
create policy pfv_insert_own on photo_field_values for insert with check (
  is_active_user() and exists (select 1 from photos p where p.id = photo_id and p.uploaded_by = auth.uid()));
create policy pfv_admin on photo_field_values for all using (is_admin()) with check (is_admin());
