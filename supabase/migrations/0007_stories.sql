-- Phase 9: impact stories, case studies and campaigns written from field reports, with AI suggestions.
create table stories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('impact_story','case_study','campaign')),
  title text not null,
  slug text unique,
  summary text,
  body_md text not null default '',
  language text not null default 'en' check (language in ('en','hi')),
  status text not null default 'draft' check (status in ('idea','draft','ready','published')),
  theme_ids uuid[] not null default '{}',
  source_report_ids uuid[] not null default '{}',
  plan jsonb,                        -- campaign plan: goal, audience, key messages, channels, timeline, calls to action
  ai_generated boolean not null default false,
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  published_url text,                -- where it was put on the website, filled in by hand
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on stories (status, kind);
create index on stories using gin (theme_ids);
create trigger stories_updated before update on stories for each row execute function set_updated_at();

create table story_photos (
  story_id uuid not null references stories on delete cascade,
  photo_id uuid not null references photos on delete cascade,
  sort_order int not null default 0,
  primary key (story_id, photo_id)
);
create index on story_photos (photo_id);

-- Ideas the AI proposes from recent reports. The admin accepts or dismisses them.
create table story_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('impact_story','case_study','campaign')),
  title text not null,
  rationale text,
  report_ids uuid[] not null default '{}',
  theme_ids uuid[] not null default '{}',
  suggested_window text,
  problem text,                      -- the problem in one or two sentences
  places text,                       -- where it was reported ("6 villages in Chatra and Giridih")
  why_now text,                      -- e.g. an awareness day or a season
  status text not null default 'new' check (status in ('new','accepted','dismissed')),
  story_id uuid references stories on delete set null,
  created_at timestamptz not null default now()
);
create index on story_suggestions (status, created_at desc);

-- Posts planned from a story or campaign keep a link back to it.
alter table content_items add column source_story_id uuid references stories on delete set null;

-- Photos that stop a story from being marked ready: no consent for public use.
-- Photos with children are not blocked here; the app shows a warning for them.
create or replace function story_blockers(p_story uuid) returns table (photo_id uuid, reason text)
language sql stable security definer set search_path = public as $$
  select p.id, 'no_consent'
  from story_photos sp join photos p on p.id = sp.photo_id
  where is_admin() and sp.story_id = p_story and p.consent <> 'yes'
$$;

create or replace function guard_story_status() returns trigger language plpgsql as $$
begin
  if new.status in ('ready','published') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if exists (select 1 from story_photos sp join photos p on p.id = sp.photo_id
               where sp.story_id = new.id and p.consent <> 'yes') then
      raise exception 'Some photos in this story do not have consent for public use. Remove them first.';
    end if;
    if new.ai_generated and new.reviewed_at is null then
      raise exception 'An AI-written draft must be reviewed before it is marked ready.';
    end if;
  end if;
  return new;
end $$;
create trigger stories_status_guard before insert or update of status on stories
  for each row execute function guard_story_status();

-- A photo in a story without consent cannot be added once the story is ready or published.
create or replace function guard_story_photo() returns trigger language plpgsql as $$
begin
  if exists (select 1 from stories s where s.id = new.story_id and s.status in ('ready','published'))
     and exists (select 1 from photos p where p.id = new.photo_id and p.consent <> 'yes') then
    raise exception 'This story is ready or published: only photos with consent for public use can be added.';
  end if;
  return new;
end $$;
create trigger story_photos_guard before insert on story_photos for each row execute function guard_story_photo();

-- photos.has_story follows story_photos (the gallery filters on it).
create or replace function sync_has_story() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.photo_id, old.photo_id);
begin
  update photos set has_story = exists (select 1 from story_photos where photo_id = pid) where id = pid;
  return null;
end $$;
create trigger story_photos_has_story after insert or delete on story_photos for each row execute function sync_has_story();

-- Photos used in a story are protected from trash, archive and purge, like photos in Scheduled/Published posts.
create or replace function photo_is_protected(p_photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from content_item_photos cip
    join content_items ci on ci.id = cip.content_item_id
    join calendar_options o on o.type = 'status' and o.value = ci.status
    where cip.photo_id = p_photo and o.protects_photos)
  or exists (select 1 from story_photos sp where sp.photo_id = p_photo)
$$;

revoke execute on function story_blockers(uuid) from public, anon;

alter table stories enable row level security;
alter table story_photos enable row level security;
alter table story_suggestions enable row level security;
create policy stories_admin on stories for all using (is_admin()) with check (is_admin());
create policy story_photos_admin on story_photos for all using (is_admin()) with check (is_admin());
create policy story_suggestions_admin on story_suggestions for all using (is_admin()) with check (is_admin());
