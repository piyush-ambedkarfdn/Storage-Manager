-- Phase 10: per-staff statistics for the admin activity page. Admin only.
-- Days are counted in India time (Asia/Kolkata), not UTC.
create or replace function staff_stats() returns table (
  user_id uuid, full_name text, login_id text, role text, active boolean, last_seen_at timestamptz,
  districts text, photos_total bigint, photos_week bigint, storage_bytes bigint, names_suggested bigint, reports_total bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.full_name, pr.login_id, pr.role, pr.active, pr.last_seen_at,
    (select string_agg(d.name, ', ' order by d.name) from districts d where d.id = any(pr.assigned_district_ids)),
    (select count(*) from photos p where p.uploaded_by = pr.id and p.status <> 'purged'),
    (select count(*) from photos p where p.uploaded_by = pr.id and p.created_at > now() - interval '7 days'),
    (select coalesce(sum(p.size_bytes + coalesce(p.thumb_size_bytes,0)),0) from photos p
       where p.uploaded_by = pr.id and p.status in ('active','trashed')),
    (select count(*) from villages v where v.suggested_by = pr.id)
    + (select count(*) from panchayats x where x.suggested_by = pr.id)
    + (select count(*) from blocks b where b.suggested_by = pr.id),
    (select count(*) from field_reports r where r.uploaded_by = pr.id)
  from profiles pr
  where is_admin()
  order by pr.active desc, pr.full_name
$$;

create or replace function uploads_per_day(p_user uuid, p_days int default 14) returns table (day date, photos bigint)
language sql stable security definer set search_path = public as $$
  with days as (
    select generate_series((now() at time zone 'Asia/Kolkata')::date - (greatest(1, least(p_days, 90)) - 1),
                           (now() at time zone 'Asia/Kolkata')::date, interval '1 day')::date as day
  )
  select d.day, count(p.id)
  from days d
  left join photos p on p.uploaded_by = p_user and (p.created_at at time zone 'Asia/Kolkata')::date = d.day
  where is_admin()
  group by d.day order by d.day
$$;

create index if not exists activity_log_created_idx on activity_log (created_at desc);

revoke execute on function staff_stats() from public, anon;
revoke execute on function uploads_per_day(uuid, int) from public, anon;
