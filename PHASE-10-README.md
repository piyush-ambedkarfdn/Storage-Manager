# Phase 10: Staff activity and polish

Admin sees what each staff member did. PWA install and offline shell.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0008_activity_summary.sql in the Supabase SQL editor.
2. App icons are included (public/icons/icon-192.png and icon-512.png). Replace them with your logo if you like (same names and sizes, square PNG; keep the important part in the middle 80% so phones can crop it to a circle).
3. The install prompt and offline shell need HTTPS (any real host) or localhost.

## Database

Run `supabase/migrations/0008_activity_summary.sql` in the Supabase SQL editor.

## Files added

- supabase/migrations/0008_activity_summary.sql
- src/app/admin/activity/page.tsx
- src/app/api/activity/route.ts
- src/app/api/activity/export/route.ts
- src/components/activity/StaffList.tsx
- src/components/activity/StaffSummaryCards.tsx
- src/components/activity/UploadsChart.tsx
- src/components/activity/ActivityTimeline.tsx
- src/components/activity/ActivityFilters.tsx
- src/lib/activity-queries.ts
- src/lib/schemas/activity.ts
- src/types/activity-view.ts
- src/lib/i18n/messages/activity.ts
- src/app/manifest.ts
- public/sw.js
- public/icons/icon-192.png
- public/icons/icon-512.png

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- Staff activity appears in the sidebar. Pick a person: photo, report, storage and names numbers match the database; the 14-day chart (India dates) matches their uploads; 'Show as a table' gives the exact numbers.
- The timeline shows what they did, newest first, grouped by day; filter by action group and dates; 'Everyone' shows the whole log with names (the daily purge shows as 'Daily job').
- View their photos opens the gallery filtered to that uploader.
- Export activity CSV downloads the filtered timeline (opens in Excel with Hindi intact).
- On a phone (Chrome/Android): open the site, use it once, then 'Install the app' / Add to home screen; it opens full screen with the icon. Turn on airplane mode and open it: the upload page still opens and photos can be queued.
- Sign out and sign in as someone else: the previous person's saved pages are gone.
