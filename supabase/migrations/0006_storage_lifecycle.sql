-- Phase 7: trash, archive, purge and cleanup candidates. Admin only. R2 objects are deleted by the app
-- BEFORE the matching mark_* function runs, so a row never says "present" without its file.
alter table photos add column original_deleted_at timestamptz;

-- Photos matching the cleanup filters, minus protected ones. Used for the preview and for applying.
-- p_only: 'downloaded' | 'unused' | 'low_quality' | null
create or replace function cleanup_candidates(
  p_older_than_days int,
  p_program uuid default null,
  p_uploader uuid default null,
  p_only text default null
) returns table (id uuid, storage_provider text, storage_key text, thumb_key text, size_bytes int, thumb_size_bytes int)
language sql stable security definer set search_path = public as $$
  select p.id, p.storage_provider, p.storage_key, p.thumb_key, p.size_bytes, p.thumb_size_bytes
  from photos p
  where is_admin()
    and p.status = 'active'
    and p.created_at < now() - make_interval(days => p_older_than_days)
    and (p_program is null or p.program_id = p_program)
    and (p_uploader is null or p.uploaded_by = p_uploader)
    and (p_only is null
         or (p_only = 'downloaded' and p.last_downloaded_at is not null)
         or (p_only = 'unused' and not exists (select 1 from content_item_photos c where c.photo_id = p.id))
         or (p_only = 'low_quality' and p.ai_quality is not null and p.ai_quality <= 2))
    and not photo_is_protected(p.id)
$$;

create or replace function trash_photos(p_ids uuid[]) returns table (trashed int, skipped uuid[])
language plpgsql security definer set search_path = public as $$
declare ok uuid[]; bad uuid[];
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select coalesce(array_agg(id) filter (where not photo_is_protected(id)), '{}'),
         coalesce(array_agg(id) filter (where photo_is_protected(id)), '{}')
    into ok, bad from photos where id = any(p_ids) and status = 'active';
  update photos set status = 'trashed', trashed_at = now() where id = any(ok);
  insert into activity_log (actor, action, entity_type, detail)
    values (auth.uid(), 'photos_trashed', 'photo', jsonb_build_object('count', coalesce(array_length(ok,1),0), 'skipped', coalesce(array_length(bad,1),0)));
  return query select coalesce(array_length(ok,1),0), bad;
end $$;

create or replace function restore_photos(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update photos set status = 'active', trashed_at = null where id = any(p_ids) and status = 'trashed';
  get diagnostics n = row_count;
  insert into activity_log (actor, action, entity_type, detail)
    values (auth.uid(), 'photos_restored', 'photo', jsonb_build_object('count', n));
  return n;
end $$;

-- Call AFTER the original object was deleted from R2. The thumbnail stays.
create or replace function mark_archived(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update photos set status = 'archived', original_deleted_at = now()
   where id = any(p_ids) and status = 'active' and not photo_is_protected(id);
  get diagnostics n = row_count;
  insert into activity_log (actor, action, entity_type, detail)
    values (auth.uid(), 'photos_archived', 'photo', jsonb_build_object('count', n));
  return n;
end $$;

-- Photos still on a provider, for moving them to the other one. Archived photos only have a thumbnail left.
-- p_exclude: photos that failed earlier in this run (so a broken photo does not block the rest).
create or replace function move_candidates(p_from text, p_limit int default 50, p_exclude uuid[] default '{}')
returns table (id uuid, storage_key text, thumb_key text, size_bytes int, thumb_size_bytes int, original_deleted boolean, program_slug text)
language sql stable security definer set search_path = public as $$
  select p.id, p.storage_key, p.thumb_key, p.size_bytes, p.thumb_size_bytes, p.original_deleted_at is not null, coalesce(g.slug, 'no-program')
  from photos p
  left join programs g on g.id = p.program_id
  where is_admin() and p.storage_provider = p_from and p.status in ('active','trashed','archived')
    and not (p.id = any(coalesce(p_exclude, '{}')))
  order by p.created_at
  limit greatest(1, least(p_limit, 200))
$$;

-- How much was uploaded per storage in the last p_days days (for the runway estimate).
create or replace function upload_rate(p_days int default 30)
returns table (provider text, bytes bigint, photos bigint)
language sql stable security definer set search_path = public as $$
  select p.storage_provider, coalesce(sum(p.size_bytes + coalesce(p.thumb_size_bytes, 0)), 0), count(*)
  from photos p
  where is_admin() and p.created_at >= now() - make_interval(days => greatest(1, p_days))
  group by 1
$$;

-- Call AFTER the files exist on the new provider and the old ones are deleted. Keys are those on the new provider.
create or replace function mark_moved(p_id uuid, p_to text, p_storage_key text, p_thumb_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_to not in ('r2','gdrive') then raise exception 'unknown storage %', p_to; end if;
  update photos set storage_provider = p_to, storage_key = coalesce(p_storage_key, storage_key), thumb_key = p_thumb_key
   where id = p_id;
  if not found then raise exception 'photo % not found', p_id; end if;
end $$;

-- Trashed photos older than the trash window (days come from app_settings).
create or replace function purge_due() returns table (id uuid, storage_provider text, storage_key text, thumb_key text)
language sql stable security definer set search_path = public as $$
  select p.id, p.storage_provider, p.storage_key, p.thumb_key from photos p
  where p.status = 'trashed'
    and p.trashed_at < now() - make_interval(days => coalesce(
          (select (value->>'trash_days')::int from app_settings where key = 'storage'), 30))
$$;

-- Call AFTER original and thumbnail were deleted from R2. Service-role only (cron job).
create or replace function mark_purged(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update photos set status = 'purged', purged_at = now(), original_deleted_at = coalesce(original_deleted_at, now())
   where id = any(p_ids) and status = 'trashed';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function purge_due() from public, anon, authenticated;
revoke execute on function mark_purged(uuid[]) from public, anon, authenticated;

revoke execute on function cleanup_candidates(int, uuid, uuid, text) from public, anon;
revoke execute on function trash_photos(uuid[]) from public, anon;
revoke execute on function restore_photos(uuid[]) from public, anon;
revoke execute on function mark_archived(uuid[]) from public, anon;
revoke execute on function move_candidates(text, int, uuid[]) from public, anon;
revoke execute on function upload_rate(int) from public, anon;
revoke execute on function mark_moved(uuid, text, text, text) from public, anon;
