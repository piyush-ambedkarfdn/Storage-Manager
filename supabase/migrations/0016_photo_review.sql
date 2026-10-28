-- Review and approval: photos uploaded by staff wait for an admin ('pending') and appear in the gallery, the Program tab,
-- the calendar and downloads only once approved ('active'). A rejected photo ('rejected') is removed from storage and
-- stays visible to the person who uploaded it, with the admin's reason. Photos uploaded by admins are approved at once.
-- Safe to run more than once. Existing photos are not changed (they stay 'active').

-- 1. the new states
alter table photos drop constraint if exists photos_status_check;
alter table photos add constraint photos_status_check check (status in ('pending','active','rejected','trashed','archived','purged'));

-- 2. who decided, when, and why
alter table photos add column if not exists reviewed_by uuid references profiles on delete set null;
alter table photos add column if not exists reviewed_at timestamptz;
alter table photos add column if not exists review_note text;

-- 3. the same photo cannot wait twice, nor be uploaded while it is already in the library
drop index if exists photos_hash_active;
create unique index photos_hash_active on photos (content_hash) where status in ('active','pending') and content_hash is not null;

create or replace function photo_hash_exists(p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_active_user() and exists (select 1 from photos where content_hash = p_hash and status in ('active','pending'))
$$;

-- 4. staff see their own photos in every review state, and can only ever add photos that are waiting for review
drop policy if exists photos_own on photos;
create policy photos_own on photos for select using (uploaded_by = auth.uid() and status in ('pending','active','rejected'));
drop policy if exists photos_insert on photos;
create policy photos_insert on photos for insert with check (is_active_user() and uploaded_by = auth.uid() and status = 'pending');

-- 5. the review queue
create index if not exists photos_pending_idx on photos (created_at) where status = 'pending';

-- 6. waiting photos use storage too: they count towards the meters
create or replace function storage_usage() returns table (
  provider text, used_bytes bigint, active_count bigint, trashed_count bigint, archived_count bigint)
language sql stable security definer set search_path = public as $$
  with ph as (
    select
      p.storage_provider as provider,
      coalesce(sum(p.size_bytes + coalesce(p.thumb_size_bytes,0)) filter (where p.status in ('active','trashed','pending')),0)
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

-- 7. approve or reject waiting photos in one step. Returns the photos that changed (the app deletes the files of rejected ones).
create or replace function review_photos(p_ids uuid[], p_approve boolean, p_note text default null)
returns table (id uuid, storage_provider text, storage_key text, thumb_key text)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can review photos.' using errcode = '42501'; end if;
  return query
    update photos p
       set status = case when p_approve then 'active' else 'rejected' end,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           review_note = case when p_approve then null else nullif(trim(p_note), '') end
     where p.id = any(p_ids) and p.status = 'pending'
    returning p.id, p.storage_provider, p.storage_key, p.thumb_key;
end $$;
revoke execute on function review_photos(uuid[], boolean, text) from public, anon;
grant execute on function review_photos(uuid[], boolean, text) to authenticated;
