-- Phase 3: programs, places (with LGD codes), aliases, dropdown options, similar-name functions.
create table programs (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,                -- used in R2 keys; never change after photos exist
  name_norm text generated always as (norm_name(name)) stored,
  hidden boolean not null default false,
  sort_order int not null default 0
);
create table districts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  name_norm text generated always as (norm_name(name)) stored,
  lgd_code int unique,
  source text not null default 'user' check (source in ('lgd','user'))
);
create table blocks (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts,
  name text not null,
  name_norm text generated always as (norm_name(name)) stored,
  lgd_code int unique,
  source text not null default 'user' check (source in ('lgd','user')),
  approved boolean not null default true,
  suggested_by uuid references profiles on delete set null
);
create table panchayats (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks,
  name text not null,
  name_norm text generated always as (norm_name(name)) stored,
  lgd_code int unique,
  source text not null default 'user' check (source in ('lgd','user')),
  approved boolean not null default true,
  suggested_by uuid references profiles on delete set null
);
-- A village sits under one main panchayat. LGD maps a few villages to several; keep the main one.
create table villages (
  id uuid primary key default gen_random_uuid(),
  panchayat_id uuid not null references panchayats,
  name text not null,
  name_norm text generated always as (norm_name(name)) stored,
  lgd_code int unique,
  source text not null default 'user' check (source in ('lgd','user')),
  approved boolean not null default true,
  suggested_by uuid references profiles on delete set null
);
create index on blocks (district_id);
create index on panchayats (block_id);
create index on villages (panchayat_id);
create index on programs   using gin (name_norm gin_trgm_ops);
create index on blocks     using gin (name_norm gin_trgm_ops);
create index on panchayats using gin (name_norm gin_trgm_ops);
create index on villages   using gin (name_norm gin_trgm_ops);

create table name_aliases (
  entity_type text not null check (entity_type in ('program','block','panchayat','village')),
  entity_id uuid not null,
  alias_norm text not null,
  primary key (entity_type, alias_norm)
);

-- Admin-managed dropdown lists: content calendar options and the problem themes used on field reports.
create table calendar_options (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('platform','format','pillar','goal','status','stage','theme')),   -- theme = problem themes for field reports
  value text not null,
  color text,                                -- used for status and stage chips
  sort_order int not null default 0,
  hidden boolean not null default false,
  protects_photos boolean not null default false,   -- status only: photos in such posts cannot be trashed
  unique (type, value)
);

-- Score 1.0 = same spelling after norm_name() or a saved alias (auto-select); >= 0.5 = "Did you mean?"; lower = new name.
create or replace function find_similar_names(p_type text, p_input text, p_parent uuid default null)
returns table (id uuid, name text, score real, same_parent boolean)
language plpgsql stable security definer set search_path = public as $$
declare q text := norm_name(p_input);
begin
  if not is_active_user() then raise exception 'not allowed'; end if;
  if p_type = 'village' then
    return query
      select v.id, v.name,
             (case when v.name_norm = q
                     or exists (select 1 from name_aliases a where a.entity_type='village' and a.entity_id=v.id and a.alias_norm=q)
                   then 1
                   else greatest(similarity(v.name_norm, q), case when levenshtein(v.name_norm, q) <= 2 then 0.6 else 0 end)
              end)::real,
             (p_parent is not null and v.panchayat_id = p_parent)
      from villages v
      where v.name_norm % q or levenshtein(v.name_norm, q) <= 2
         or exists (select 1 from name_aliases a where a.entity_type='village' and a.entity_id=v.id and a.alias_norm=q)
      order by 3 desc limit 5;
  elsif p_type = 'panchayat' then
    return query
      select p.id, p.name,
             (case when p.name_norm = q
                     or exists (select 1 from name_aliases a where a.entity_type='panchayat' and a.entity_id=p.id and a.alias_norm=q)
                   then 1
                   else greatest(similarity(p.name_norm, q), case when levenshtein(p.name_norm, q) <= 2 then 0.6 else 0 end)
              end)::real,
             (p_parent is not null and p.block_id = p_parent)
      from panchayats p
      where p.name_norm % q or levenshtein(p.name_norm, q) <= 2
         or exists (select 1 from name_aliases a where a.entity_type='panchayat' and a.entity_id=p.id and a.alias_norm=q)
      order by 3 desc limit 5;
  elsif p_type = 'block' then
    return query
      select b.id, b.name,
             (case when b.name_norm = q
                     or exists (select 1 from name_aliases a where a.entity_type='block' and a.entity_id=b.id and a.alias_norm=q)
                   then 1
                   else greatest(similarity(b.name_norm, q), case when levenshtein(b.name_norm, q) <= 2 then 0.6 else 0 end)
              end)::real,
             (p_parent is not null and b.district_id = p_parent)
      from blocks b
      where b.name_norm % q or levenshtein(b.name_norm, q) <= 2
         or exists (select 1 from name_aliases a where a.entity_type='block' and a.entity_id=b.id and a.alias_norm=q)
      order by 3 desc limit 5;
  elsif p_type = 'program' then
    return query
      select g.id, g.name,
             (case when g.name_norm = q
                     or exists (select 1 from name_aliases a where a.entity_type='program' and a.entity_id=g.id and a.alias_norm=q)
                   then 1
                   else greatest(similarity(g.name_norm, q), case when levenshtein(g.name_norm, q) <= 2 then 0.6 else 0 end)
              end)::real,
             true
      from programs g
      where g.name_norm % q or levenshtein(g.name_norm, q) <= 2
         or exists (select 1 from name_aliases a where a.entity_type='program' and a.entity_id=g.id and a.alias_norm=q)
      order by 3 desc limit 5;
  else
    raise exception 'unknown type %', p_type;
  end if;
end $$;

-- Merge a duplicate into the right record. Moves children and photos, keeps the old spelling as an alias.
create or replace function merge_place(p_type text, p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
declare has_photos boolean := to_regclass('public.photos') is not null;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_from = p_into then raise exception 'cannot merge into itself'; end if;
  if p_type = 'village' then
    if has_photos then execute 'update photos set village_id = $1 where village_id = $2' using p_into, p_from; end if;
    insert into name_aliases select 'village', p_into, name_norm from villages where id = p_from on conflict do nothing;
    delete from villages where id = p_from;
  elsif p_type = 'panchayat' then
    update villages set panchayat_id = p_into where panchayat_id = p_from;
    if has_photos then execute 'update photos set panchayat_id = $1 where panchayat_id = $2' using p_into, p_from; end if;
    insert into name_aliases select 'panchayat', p_into, name_norm from panchayats where id = p_from on conflict do nothing;
    delete from panchayats where id = p_from;
  elsif p_type = 'block' then
    update panchayats set block_id = p_into where block_id = p_from;
    if has_photos then execute 'update photos set block_id = $1 where block_id = $2' using p_into, p_from; end if;
    insert into name_aliases select 'block', p_into, name_norm from blocks where id = p_from on conflict do nothing;
    delete from blocks where id = p_from;
  elsif p_type = 'program' then
    if has_photos then execute 'update photos set program_id = $1 where program_id = $2' using p_into, p_from; end if;
    insert into name_aliases select 'program', p_into, name_norm from programs where id = p_from on conflict do nothing;
    delete from programs where id = p_from;
  else
    raise exception 'unknown type %', p_type;
  end if;
  insert into activity_log (actor, action, entity_type, entity_id, detail)
    values (auth.uid(), 'place_merged', p_type, p_into::text, jsonb_build_object('from', p_from));
end $$;

-- ---------- LGD import ----------
-- The browser parses the LGD file and sends one district at a time as
-- [{dc, dn, bc, bn, pc, pn, vc, vn}] (district, block, gram panchayat and village codes and English names).
-- lgd_import(rows, false) is a preview: the same work runs, the counts are kept, then it is rolled back.
-- lgd_import(rows, true) commits. Matching: by lgd_code first, then an existing place with the same
-- normalised name under the same parent is adopted (keeps its id and photos). Renamed places keep the
-- old spelling as an alias. A village LGD maps to several panchayats keeps the first (lowest code) one.
create or replace function _lgd_level(p_level text) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare
  t text; parent_t text; fk text;
  n_total int; n_adopted int; n_renamed int; n_moved int; n_new int; n_orphan int;
begin
  t := case p_level when 'block' then 'blocks' when 'panchayat' then 'panchayats' when 'village' then 'villages' end;
  parent_t := case p_level when 'block' then 'districts' when 'panchayat' then 'blocks' when 'village' then 'panchayats' end;
  fk := case p_level when 'block' then 'district_id' when 'panchayat' then 'block_id' when 'village' then 'panchayat_id' end;
  if t is null then raise exception 'unknown level %', p_level; end if;

  select count(*) into n_total from pg_temp.lgd_level_in;
  execute format('select count(*) from pg_temp.lgd_level_in s where not exists (select 1 from %I p where p.lgd_code = s.parent_code)', parent_t)
    into n_orphan;

  -- 1. adopt a place added earlier with the same spelling under the same parent
  execute format($f$
    update %1$I x set lgd_code = s.code, source = 'lgd', approved = true
    from pg_temp.lgd_level_in s join %2$I p on p.lgd_code = s.parent_code
    where x.id = (select y.id from %1$I y
                  where y.lgd_code is null and y.%3$I = p.id and y.name_norm = norm_name(s.name) limit 1)
      and not exists (select 1 from %1$I z where z.lgd_code = s.code)$f$, t, parent_t, fk);
  get diagnostics n_adopted = row_count;

  -- 2. LGD spelling changed: keep the old one as an alias, take the new one
  execute format($f$
    insert into name_aliases (entity_type, entity_id, alias_norm)
    select %2$L, x.id, x.name_norm from %1$I x join pg_temp.lgd_level_in s on s.code = x.lgd_code
    where x.name_norm <> norm_name(s.name)
    on conflict do nothing$f$, t, p_level);
  execute format($f$
    update %1$I x set name = s.name from pg_temp.lgd_level_in s
    where s.code = x.lgd_code and x.name <> s.name$f$, t);
  get diagnostics n_renamed = row_count;

  -- 3. moved to another parent in LGD
  execute format($f$
    update %1$I x set %3$I = p.id
    from pg_temp.lgd_level_in s join %2$I p on p.lgd_code = s.parent_code
    where s.code = x.lgd_code and x.%3$I <> p.id$f$, t, parent_t, fk);
  get diagnostics n_moved = row_count;

  -- 4. new places
  execute format($f$
    insert into %1$I (%3$I, name, lgd_code, source, approved)
    select p.id, s.name, s.code, 'lgd', true
    from pg_temp.lgd_level_in s join %2$I p on p.lgd_code = s.parent_code
    where not exists (select 1 from %1$I x where x.lgd_code = s.code)$f$, t, parent_t, fk);
  get diagnostics n_new = row_count;

  return jsonb_build_object('total', n_total, 'new', n_new, 'adopted', n_adopted,
    'already', greatest(n_total - n_new - n_adopted - n_orphan, 0), 'renamed', n_renamed, 'moved', n_moved, 'orphans', n_orphan);
end $$;
revoke execute on function _lgd_level(text) from public, anon, authenticated;

create or replace function lgd_import(p_rows jsonb, p_commit boolean default false) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result jsonb := '{}'::jsonb;
  n_adopted int; n_renamed int; n_new int; n_total int; n_skipped int; n_multi int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a JSON array'; end if;

  begin
    create temp table lgd_raw on commit drop as
      select nullif(trim(x->>'dc'), '')::int as dc, trim(x->>'dn') as dn,
             nullif(trim(x->>'bc'), '')::int as bc, trim(x->>'bn') as bn,
             nullif(trim(x->>'pc'), '')::int as pc, trim(x->>'pn') as pn,
             nullif(trim(x->>'vc'), '')::int as vc, trim(x->>'vn') as vn
      from jsonb_array_elements(p_rows) x;
    delete from pg_temp.lgd_raw
      where dc is null or bc is null or pc is null or vc is null
         or coalesce(dn, '') = '' or coalesce(bn, '') = '' or coalesce(pn, '') = '' or coalesce(vn, '') = '';
    get diagnostics n_skipped = row_count;
    select count(*) into n_multi from (select vc from pg_temp.lgd_raw group by vc having count(distinct pc) > 1) m;

    -- districts (no parent)
    create temp table lgd_d on commit drop as select distinct on (dc) dc, dn from pg_temp.lgd_raw order by dc;
    select count(*) into n_total from pg_temp.lgd_d;
    update districts d set lgd_code = s.dc, source = 'lgd' from pg_temp.lgd_d s
      where d.lgd_code is null and d.name_norm = norm_name(s.dn)
        and not exists (select 1 from districts z where z.lgd_code = s.dc);
    get diagnostics n_adopted = row_count;
    update districts d set name = s.dn from pg_temp.lgd_d s where d.lgd_code = s.dc and d.name <> s.dn;
    get diagnostics n_renamed = row_count;
    insert into districts (name, lgd_code, source)
      select s.dn, s.dc, 'lgd' from pg_temp.lgd_d s where not exists (select 1 from districts z where z.lgd_code = s.dc)
      on conflict (name) do nothing;
    get diagnostics n_new = row_count;
    result := jsonb_build_object('districts', jsonb_build_object('total', n_total, 'new', n_new, 'adopted', n_adopted,
      'already', greatest(n_total - n_new - n_adopted, 0), 'renamed', n_renamed, 'moved', 0, 'orphans', 0));

    create temp table lgd_level_in (code int, name text, parent_code int) on commit drop;
    insert into pg_temp.lgd_level_in select distinct on (bc) bc, bn, dc from pg_temp.lgd_raw order by bc;
    result := result || jsonb_build_object('blocks', _lgd_level('block'));
    truncate pg_temp.lgd_level_in;
    insert into pg_temp.lgd_level_in select distinct on (pc) pc, pn, bc from pg_temp.lgd_raw order by pc;
    result := result || jsonb_build_object('panchayats', _lgd_level('panchayat'));
    truncate pg_temp.lgd_level_in;
    insert into pg_temp.lgd_level_in select distinct on (vc) vc, vn, pc from pg_temp.lgd_raw order by vc, pc;
    result := result || jsonb_build_object('villages', _lgd_level('village'));

    result := result || jsonb_build_object('skipped_rows', n_skipped, 'multi_panchayat_villages', n_multi, 'committed', p_commit);
    if not p_commit then
      raise exception using errcode = 'P0099', message = 'lgd preview: rolled back';
    end if;
  exception when sqlstate 'P0099' then
    null; -- preview: every change above is undone, the counts in result are kept
  end;

  if p_commit then
    insert into activity_log (actor, action, entity_type, detail) values (auth.uid(), 'place_imported', 'lgd', result);
  end if;
  return result;
end $$;
revoke execute on function lgd_import(jsonb, boolean) from public, anon;
grant execute on function lgd_import(jsonb, boolean) to authenticated;

alter table programs enable row level security;
alter table districts enable row level security;
alter table blocks enable row level security;
alter table panchayats enable row level security;
alter table villages enable row level security;
alter table name_aliases enable row level security;
alter table calendar_options enable row level security;

create policy programs_read on programs for select using (is_active_user());
create policy programs_admin on programs for all using (is_admin()) with check (is_admin());
create policy districts_read on districts for select using (is_active_user());
create policy districts_admin on districts for all using (is_admin()) with check (is_admin());
-- Staff may only suggest new places, never approved ones.
create policy blocks_read on blocks for select using (is_active_user());
create policy blocks_suggest on blocks for insert with check (is_active_user() and approved = false and suggested_by = auth.uid());
create policy blocks_admin on blocks for all using (is_admin()) with check (is_admin());
create policy panchayats_read on panchayats for select using (is_active_user());
create policy panchayats_suggest on panchayats for insert with check (is_active_user() and approved = false and suggested_by = auth.uid());
create policy panchayats_admin on panchayats for all using (is_admin()) with check (is_admin());
create policy villages_read on villages for select using (is_active_user());
create policy villages_suggest on villages for insert with check (is_active_user() and approved = false and suggested_by = auth.uid());
create policy villages_admin on villages for all using (is_admin()) with check (is_admin());
create policy aliases_admin on name_aliases for all using (is_admin()) with check (is_admin());
create policy options_read on calendar_options for select using (is_active_user());
create policy options_admin on calendar_options for all using (is_admin()) with check (is_admin());
