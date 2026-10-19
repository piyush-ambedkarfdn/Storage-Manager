# Program categories + admin navigation on Upload (feature pack)

Unzip over the project (it replaces some files; see the list below), then run
`supabase/migrations/0009_program_categories.sql` in the Supabase SQL editor (after 0001-0008).
No new packages.

## New files
- supabase/migrations/0009_program_categories.sql
- src/types/program-fields.ts, src/lib/schemas/program-fields.ts, src/lib/program-fields.ts
- src/app/api/program-fields/route.ts, src/app/api/program-fields/[id]/route.ts, src/app/api/program-fields/[id]/options/route.ts
- src/app/api/program-field-options/[id]/route.ts, src/app/api/photos/[id]/categories/route.ts
- src/hooks/useProgramFields.ts, src/lib/i18n/messages/categories.ts
- src/components/categories/ProgramFieldsDialog.tsx, ProgramFieldsPicker.tsx, CategoryFilterChips.tsx, PhotoCategoriesCard.tsx

## Replaced files
- src/app/(uploader)/layout.tsx (admins get the admin sidebar on Upload / My uploads)
- src/components/settings/ProgramsManager.tsx (Categories button per program)
- src/components/upload/BatchForm.tsx, src/components/upload/PhotoOverrideSheet.tsx
- src/lib/schemas/report.ts, src/lib/schemas/photo.ts, src/lib/upload/queue-db.ts, src/lib/upload/upload-file.ts
- src/app/api/photos/route.ts, src/types/photo.ts
- src/types/gallery.ts, src/lib/gallery/filters.ts, src/app/api/gallery/tree/route.ts, src/app/admin/gallery/page.tsx
- src/components/photo/PhotoDetailView.tsx
- src/components/gallery/BulkEditDialog.tsx, src/app/api/photos/bulk/route.ts, src/lib/schemas/gallery.ts

Windows: extract with 7-Zip or "Extract All" so folders named [id] are kept.
