-- Phase 5: folder tree counts for the gallery explorer.
-- Counts active photos per Program / District / Panchayat / Village, honouring the same filters as the grid
-- (folder ticks excluded: the tree shows what each folder would add).
create or replace function folder_counts(
  p_activity text[] default null,
  p_from date default null,
  p_to date default null,
  p_consent text default null,
  p_has_story boolean default null,
  p_themes uuid[] default null,
  p_uploader uuid default null
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
  group by 1,2,3,4,5,6,7,8
  order by 2, 4, 6, 8
$$;
revoke execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid) from public, anon;
grant execute on function folder_counts(text[], date, date, text, boolean, uuid[], uuid) to authenticated;

-- Gallery order (newest upload first) and the photo page's Previous / Next.
create index if not exists photos_created_at_idx on photos (created_at desc) where status = 'active';
