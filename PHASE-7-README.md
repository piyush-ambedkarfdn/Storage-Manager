# Phase 7: Storage manager

Per-provider usage meters, cleanup with preview, trash, archive, daily purge, and a tool to move photos from one storage to the other. Replaces the basic storage page from phase 4.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0006_storage_lifecycle.sql in the Supabase SQL editor.
2. Make sure CRON_SECRET is set (openssl rand -hex 32) locally and on the host.
3. Daily purge: on Vercel, vercel.json already schedules /api/cron/purge once a day (03:00 India time; Hobby allows one run a day) and Vercel sends the secret by itself. Elsewhere, use any free scheduler (for example a GitHub Actions workflow) that calls GET <APP_URL>/api/cron/purge with the header 'Authorization: Bearer <CRON_SECRET>'.
4. In Cloudflare R2, add a usage notification as a second alarm (Notifications > R2 storage).

## Database

Run `supabase/migrations/0006_storage_lifecycle.sql` in the Supabase SQL editor.

## Env values

`CRON_SECRET`

## Files added

- supabase/migrations/0006_storage_lifecycle.sql
- vercel.json
- src/app/api/storage/cleanup/preview/route.ts
- src/app/api/storage/cleanup/apply/route.ts
- src/app/api/storage/trash/route.ts
- src/app/api/storage/settings/route.ts
- src/app/api/storage/move/preview/route.ts
- src/app/api/storage/move/run/route.ts
- src/app/api/cron/purge/route.ts
- src/components/storage/UsageMeter.tsx
- src/components/storage/RunwayEstimate.tsx
- src/components/storage/CleanupFilters.tsx
- src/components/storage/CleanupPreview.tsx
- src/components/storage/TrashTable.tsx
- src/components/storage/ArchiveDialog.tsx
- src/components/storage/StorageSettingsCard.tsx
- src/components/storage/MoveStoragePanel.tsx
- src/lib/storage/cleanup.ts
- src/lib/storage/purge.ts
- src/lib/storage/move.ts
- src/lib/schemas/cleanup.ts
- src/types/cleanup.ts
- src/lib/i18n/messages/cleanup.ts

## Files replaced (full file, overwrite)

- src/config/features.ts
- src/app/admin/storage/page.tsx

## Check it works

- Storage shows one card per storage with its meter (R2 against the limit, Drive against the Google account quota), photo counts by status, and how long the space lasts.
- Limits card: change the thresholds or trash days and save; the meters follow.
- Free space: Preview shows the count and size and leaves out photos in Scheduled or Published posts. Move to trash, and Archive (originals deleted from storage, thumbnails kept, status archived, photo still in the gallery).
- Gallery: select photos and 'Move to trash' now works; protected photos are skipped.
- Trash: restore some photos, delete others for good now.
- Move photos: move from R2 to Drive (or back); they keep opening in the gallery and on the photo page; Stop halfway leaves everything consistent.
- curl -H 'Authorization: Bearer <CRON_SECRET>' <APP_URL>/api/cron/purge deletes trashed photos older than the trash window (wrong or missing secret: 401).
