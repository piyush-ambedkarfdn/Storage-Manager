# Phase 4: Storage providers and upload flow

Mobile-first upload with a field report, problem themes, similar-name warning, compression and an offline retry queue. Photos go to Cloudflare R2 or Google Drive, whichever the admin selected. Basic storage page with the provider switch.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0003_photos.sql in the Supabase SQL editor.
2. Cloudflare R2 (free plan): create a bucket. Settings > CORS policy: allow origin = your app address(es) (e.g. http://localhost:3000 and the live URL), methods PUT and GET, allowed headers Content-Type and Cache-Control. Create an API token with Object Read & Write for that bucket. Connect a custom domain (e.g. thumbs.example.org) for thumbnails; originals stay private (signed links).
3. Google Drive (optional): in Google Cloud create a project, enable the Google Drive API, set up the OAuth consent screen (External) and PUBLISH it ('In production'; tokens from an app left in 'Testing' stop working after 7 days). Scopes: drive.file, openid, email. Create an OAuth client of type Web application with the redirect URI APP_URL/api/storage/google/callback.
4. Make SECRETS_ENCRYPTION_KEY with: openssl rand -base64 32 (it signs uploads and encrypts the Google token).
5. Fill R2_*, APP_URL, SECRETS_ENCRYPTION_KEY and (for Drive) GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local and restart. As admin open Storage: R2 is active by default; to use Drive press Connect Google Drive with the organisation's account, then 'Use for new uploads'.

## Database

Run `supabase/migrations/0003_photos.sql` in the Supabase SQL editor.

## Install

```
npm i exifreader idb @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @googleapis/drive google-auth-library
```

## Env values

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_THUMB_BASE_URL`, `STORAGE_LIMIT_BYTES`, `APP_URL`, `SECRETS_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Files added

- supabase/migrations/0003_photos.sql
- src/app/(uploader)/upload/page.tsx
- src/app/(uploader)/my-uploads/page.tsx
- src/app/admin/storage/page.tsx
- src/app/api/upload-url/route.ts
- src/app/api/upload/proxy/route.ts
- src/app/api/reports/route.ts
- src/app/api/photos/route.ts
- src/app/api/photos/check-hash/route.ts
- src/app/api/media/[id]/route.ts
- src/app/api/storage/usage/route.ts
- src/app/api/storage/provider/route.ts
- src/app/api/storage/google/connect/route.ts
- src/app/api/storage/google/callback/route.ts
- src/app/api/storage/google/disconnect/route.ts
- src/components/upload/BatchForm.tsx
- src/components/upload/PlaceFields.tsx
- src/components/upload/NameCombobox.tsx
- src/components/upload/ActivityTypePicker.tsx
- src/components/upload/ThemePicker.tsx
- src/components/upload/ReportField.tsx
- src/components/upload/ConsentField.tsx
- src/components/upload/Dropzone.tsx
- src/components/upload/UploadQueue.tsx
- src/components/upload/PhotoOverrideSheet.tsx
- src/components/upload/StorageBanner.tsx
- src/components/uploads/MyUploadsGrid.tsx
- src/components/uploads/MyReportsList.tsx
- src/components/storage/ProviderCard.tsx
- src/components/storage/GoogleConnectCard.tsx
- src/components/storage/StorageOverview.tsx
- src/hooks/useUploadQueue.ts
- src/hooks/useSimilarNames.ts
- src/hooks/useStorageUsage.ts
- src/lib/storage/types.ts
- src/lib/storage/index.ts
- src/lib/storage/r2-provider.ts
- src/lib/storage/drive-provider.ts
- src/lib/storage/google-auth.ts
- src/lib/storage/secrets.ts
- src/lib/storage-guard.ts
- src/lib/image.ts
- src/lib/upload/queue-db.ts
- src/lib/upload/upload-file.ts
- src/lib/schemas/photo.ts
- src/lib/schemas/report.ts
- src/lib/schemas/storage.ts
- src/types/photo.ts
- src/types/report.ts
- src/types/storage.ts
- src/lib/i18n/messages/upload.ts
- src/lib/i18n/messages/storage.ts

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- On a phone: fill the batch details and the four report boxes, pick two themes, add 5 photos (camera or gallery), Upload. Files appear in R2 (originals/... and thumbs/...), 5 rows in photos, one row in field_reports with report_parts.
- Typing 'Chhatra' where 'Chatra' exists shows 'Did you mean “Chatra”?'; a genuinely new village is saved for the admin and appears under Settings > Names to review.
- Turn on airplane mode mid-upload: the queue says it is offline; reload the page; turn the network back on: the remaining photos upload by themselves.
- Uploading the same photo again shows 'Already uploaded' and no new row is made.
- My uploads shows each report as written, its themes and its thumbnails.
- Admin Storage: provider cards, usage meters with 70/85/95% marks, Google connect. After connecting Drive and choosing it, new uploads land in the app's Drive folder and show in My uploads; older photos still show from R2.
- Staff calling PUT /api/storage/provider get 403.
- Set STORAGE_LIMIT_BYTES very low: uploads stop with a clear message, the photos wait on the phone, and everyone sees the storage banner.
