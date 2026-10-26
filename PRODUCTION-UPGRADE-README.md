# Production upgrade: saved drafts, phone-safe upload, program-first gallery filter, speed

## Apply
1. Unzip over the project root (replaces 19 files, adds 21).
2. Supabase SQL editor: run `supabase/migrations/0015_performance_indexes.sql` (safe to run twice; only adds indexes).
3. Restart `npm run dev` (next.config.ts changed). No new npm packages.

## What changed
- Phone upload: photos are shrunk one by one as soon as they are picked (small previews, small files saved on the phone);
  Upload can no longer stay faded: any failure shows a message and keeps the photos; a fixed bottom bar keeps Upload in reach.
- Drafts (deleted automatically): unfinished upload 24 h, New item in the calendar 12 h, gallery filters 30 min (this tab).
  Sign-out removes all drafts on the device.
- Gallery: Program dropdown first. Choose a program to see its categories and Type of activity. "Clear all filters" button.
  On phones the other filters fold into one Filters button.
- Speed and loaders: loading screens for admin and staff pages, top progress bar on page changes, 30 s page cache,
  rarely used dialogs load only when opened, grid keeps the old photos while a filter loads, new database indexes.

## Check on a phone
Pick 5 photos, press Upload: the button shows "Preparing..." then "Saving on your phone...", then the queue screen.
Switch to My uploads and back: the form, place and photos are still there.
