-- Speed: indexes for the most used list queries. Safe to run more than once; nothing is changed or removed.

-- My uploads: one person's own photos, newest date first.
create index if not exists photos_uploader_event_idx on photos (uploaded_by, event_date desc nulls last, created_at desc) where status = 'active';

-- Gallery narrowed to one program or village, newest first (the explorer tree and the Program tab).
create index if not exists photos_program_created_idx on photos (program_id, created_at desc) where status = 'active';
create index if not exists photos_village_created_idx on photos (village_id, created_at desc) where status = 'active';

-- Gallery filtered by type of activity.
create index if not exists photos_activity_created_idx on photos (activity_type, created_at desc) where status = 'active';

analyze photos;
