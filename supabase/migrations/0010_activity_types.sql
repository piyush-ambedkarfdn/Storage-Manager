-- Activity types become editable in Settings (they were fixed in src/config/activity-types.ts).
-- photos.activity_type and field_reports.activity_type keep storing the id (a short code such as
-- "training"), so renaming or recolouring a type never touches photos.
create table activity_types (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  label text not null,
  label_hi text,
  color text not null default '#7A8AA3' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  hidden boolean not null default false,  -- hidden = retired: not offered, still shown on old photos
  created_at timestamptz not null default now(),
  unique (label)
);

insert into activity_types (id, label, label_hi, color, sort_order) values
  ('training', 'Training', 'प्रशिक्षण', '#3B7DD8', 1),
  ('meeting', 'Meeting', 'बैठक', '#8B63D9', 2),
  ('distribution', 'Distribution', 'वितरण', '#D99A1E', 3),
  ('rally', 'Rally', 'रैली', '#D2543C', 4),
  ('home-visit', 'Home visit', 'गृह भ्रमण', '#2E9E6B', 5)
on conflict (id) do nothing;

-- A type used by photos or reports cannot be deleted; hide it instead.
create or replace function guard_activity_type_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select (select count(*) from photos where activity_type = old.id) + (select count(*) from field_reports where activity_type = old.id) into n;
  if n > 0 then
    raise exception '% photos or reports use “%”. Hide it instead of deleting.', n, old.label;
  end if;
  return old;
end $$;
create trigger activity_types_delete_guard before delete on activity_types for each row execute function guard_activity_type_delete();

alter table activity_types enable row level security;
create policy activity_types_read on activity_types for select using (is_active_user());
create policy activity_types_admin on activity_types for all using (is_admin()) with check (is_admin());
