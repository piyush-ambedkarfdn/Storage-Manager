-- Phase 4: field reports, photos, storage provider setting and connections, usage per provider.

-- A field report is what staff write when they upload a batch of photos: what happened, the problem,
-- who was affected, the outcome. AI uses it for captions (phase 8) and for stories and campaigns (phase 9).
create table field_reports (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references profiles,
  client_ref uuid unique,                -- id made by the phone's upload queue; a retried request returns the same report
  program_id uuid references programs,
  district_id uuid references districts,
  block_id uuid references blocks,
  panchayat_id uuid references panchayats,
  village_id uuid references villages,
  activity_type text,                    -- id from src/config/activity-types.ts (no CHECK: the list lives in code)
  event_date date,
  report text,                           -- written by staff, any language (the four parts joined, for search and AI)
  report_parts jsonb,                    -- what staff typed, per question: {what_happened, problem, who_affected, result}
  theme_ids uuid[] not null default '{}',-- ids of calendar_options rows with type = 'theme'
  beneficiary_count int,
  ai_summary text,                       -- short English summary written by AI (phase 8)
  ai_problems text[],                    -- problems the report describes, one short line each (phase 8)
  ai_theme_ids uuid[] not null default '{}',   -- themes AI suggests (phase 8)
  -- The staff report "improved" by AI (phase 8): same facts, clearer sentences. Never replaces what staff wrote.
  ai_report_en text,                     -- clear English version
  ai_report_hi text,                     -- clear Hindi version (only when asked)
  ai_sections jsonb,                     -- {what_happened, problem, who_affected, result} as AI understood them
  ai_missing text[],                     -- facts the report does not give, shown as "[confirm: ...]"
  ai_model text,                         -- model that wrote the ai_* fields
  ai_processed_at timestamptz,
  -- Admin review of the AI version (photo detail page, phase 5 UI). Only 'accepted' text may feed captions and stories as-is.
  ai_review_status text not null default 'none' check (ai_review_status in ('none','draft','accepted','rejected')),
  ai_reviewed_by uuid references profiles on delete set null,
  ai_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on field_reports (uploaded_by, created_at desc);
create index on field_reports (district_id, village_id, event_date);
create index on field_reports using gin (theme_ids);
create index on field_reports (ai_review_status) where ai_review_status = 'draft';

create table photos (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references profiles,
  report_id uuid references field_reports on delete set null,
  taken_by text,
  program_id uuid references programs,
  district_id uuid references districts,
  block_id uuid references blocks,
  panchayat_id uuid references panchayats,
  village_id uuid references villages,
  activity_type text,
  event_date date,
  consent text not null default 'unknown' check (consent in ('yes','no','unknown')),
  has_children boolean not null default false,
  has_story boolean not null default false,
  note text,                             -- one line about this photo
  -- where the files live. storage_key is an R2 object key or a Google Drive file id.
  storage_provider text not null default 'r2' check (storage_provider in ('r2','gdrive')),
  storage_key text not null,
  thumb_key text not null,
  width int, height int,
  size_bytes int not null,
  thumb_size_bytes int,
  content_hash text,
  exif_taken_at timestamptz,
  status text not null default 'active' check (status in ('active','trashed','archived','purged')),
  trashed_at timestamptz,
  purged_at timestamptz,
  last_downloaded_at timestamptz,
  ai_description text,
  ai_tags text[],
  ai_quality int check (ai_quality between 1 and 5),
  ai_suitable_for_social boolean,
  created_at timestamptz not null default now()
);
create index on photos (program_id, district_id, panchayat_id, village_id);
create index on photos (uploaded_by, created_at desc);
create index on photos (status, created_at);
create index on photos (event_date);
create index on photos (report_id);
create index on photos (storage_provider, status);
create index on photos using gin (ai_tags);
create unique index photos_hash_active on photos (content_hash) where status = 'active' and content_hash is not null;

-- Which storage new uploads go to. Only admins change it. Existing photos stay where they are.
insert into app_settings values ('storage_provider', '{"active":"r2"}') on conflict (key) do nothing;

-- Google Drive connection. The refresh token is encrypted by the app. No policies: only the server
-- (service role) can read this table. Admins see a safe summary through storage_connection_status().
create table storage_connections (
  provider text primary key check (provider in ('gdrive')),
  account_email text,
  root_folder_id text,
  refresh_token_enc text not null,
  connected_by uuid references profiles on delete set null,
  connected_at timestamptz not null default now()
);
alter table storage_connections enable row level security;

-- Cache of Drive folder ids by path. Server only.
create table storage_folders (
  provider text not null,
  path text not null,
  folder_id text not null,
  primary key (provider, path)
);
alter table storage_folders enable row level security;

create or replace function storage_connection_status() returns table (
  provider text, account_email text, root_folder_id text, connected_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.provider, c.account_email, c.root_folder_id, c.connected_at
  from storage_connections c where is_admin()
$$;

-- Originals + thumbnails for active/trashed photos; thumbnails only for archived ones; purged count zero.
create or replace function storage_usage() returns table (
  provider text, used_bytes bigint, active_count bigint, trashed_count bigint, archived_count bigint)
language sql stable security definer set search_path = public as $$
  select
    p.storage_provider,
    coalesce(sum(p.size_bytes + coalesce(p.thumb_size_bytes,0)) filter (where p.status in ('active','trashed')),0)
    + coalesce(sum(coalesce(p.thumb_size_bytes,0)) filter (where p.status = 'archived'),0),
    count(*) filter (where p.status = 'active'),
    count(*) filter (where p.status = 'trashed'),
    count(*) filter (where p.status = 'archived')
  from photos p
  where is_active_user()
  group by p.storage_provider
$$;

-- Duplicate check before uploading: true if an active photo (anyone's) has this fingerprint.
-- Staff cannot read other people's photos, so this answers yes/no without revealing the photo.
create or replace function photo_hash_exists(p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_active_user() and exists (select 1 from photos where content_hash = p_hash and status = 'active')
$$;
revoke execute on function photo_hash_exists(text) from public, anon;
grant execute on function photo_hash_exists(text) to authenticated;

-- A theme that reports use cannot be deleted; hide it instead.
create or replace function block_theme_delete_if_used() returns trigger language plpgsql as $$
declare used int;
begin
  if old.type = 'theme' then
    select count(*) into used from field_reports where theme_ids @> array[old.id];
    if used > 0 then
      raise exception 'Theme "%" is used by % reports. Hide it instead.', old.value, used;
    end if;
  end if;
  return old;
end $$;
create trigger calendar_options_theme_delete before delete on calendar_options
  for each row execute function block_theme_delete_if_used();

alter table field_reports enable row level security;
alter table photos enable row level security;
create policy reports_insert on field_reports for insert with check (is_active_user() and uploaded_by = auth.uid());
create policy reports_own on field_reports for select using (uploaded_by = auth.uid());
create policy reports_admin on field_reports for all using (is_admin()) with check (is_admin());
create policy photos_insert on photos for insert with check (is_active_user() and uploaded_by = auth.uid());
create policy photos_own on photos for select using (uploaded_by = auth.uid() and status = 'active');
create policy photos_admin on photos for all using (is_admin()) with check (is_admin());
