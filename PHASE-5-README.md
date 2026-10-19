# Phase 5: Gallery and structured download

Folder-tree explorer (Program / District / Panchayat / Village), combined filters including problem themes, selection, a full photo detail page (what staff entered plus the AI-improved report), folder-structured downloads from either storage, bulk edit.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0004_gallery_tree.sql.

## Database

Run `supabase/migrations/0004_gallery_tree.sql` in the Supabase SQL editor.

## Install

```
npm i client-zip
```

## Files added

- supabase/migrations/0004_gallery_tree.sql
- src/app/admin/gallery/page.tsx
- src/app/api/gallery/route.ts
- src/app/api/gallery/tree/route.ts
- src/app/api/photos/[id]/route.ts
- src/app/api/photos/bulk/route.ts
- src/app/api/reports/[id]/route.ts
- src/app/api/download-manifest/route.ts
- src/app/api/download-log/route.ts
- src/components/gallery/FolderTree.tsx
- src/components/gallery/FolderTreeNode.tsx
- src/components/gallery/Crumbs.tsx
- src/components/gallery/FilterBar.tsx
- src/components/gallery/ActivityFilterChips.tsx
- src/components/gallery/ThemeFilterChips.tsx
- src/components/gallery/PhotoGrid.tsx
- src/components/gallery/PhotoCard.tsx
- src/components/gallery/SelectionBar.tsx
- src/components/gallery/DownloadDialog.tsx
- src/components/gallery/BulkEditDialog.tsx
- src/app/admin/photos/[id]/page.tsx
- src/app/api/reports/[id]/review/route.ts
- src/components/photo/PhotoDetailView.tsx
- src/components/photo/PhotoViewer.tsx
- src/components/photo/PhotoFacts.tsx
- src/components/photo/ReportView.tsx
- src/components/photo/AiReportCard.tsx
- src/components/photo/ReportEditDialog.tsx
- src/components/photo/AiDescriptionCard.tsx
- src/components/photo/PhotoNeighbours.tsx
- src/lib/photos/detail.ts
- src/hooks/usePhotoDetail.ts
- src/lib/schemas/photo-detail.ts
- src/types/photo-detail.ts
- src/lib/i18n/messages/photo.ts
- src/hooks/useGalleryFilters.ts
- src/hooks/useFolderTree.ts
- src/lib/gallery/filters.ts
- src/lib/gallery/tree.ts
- src/lib/download/paths.ts
- src/lib/download/manifest.ts
- src/lib/download/zip.ts
- src/lib/download/fs-writer.ts
- src/lib/download/run-download.ts
- src/lib/schemas/gallery.ts
- src/types/gallery.ts
- src/lib/i18n/messages/gallery.ts

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- Ticking a district ticks everything inside it; ticking villages in two districts shows both as chips.
- Activity chips and theme chips combine with the folder selection.
- Clicking a photo opens /admin/photos/<id>: large photo, everything staff entered (place, activity, date, taken by, consent, children flag, note, the four report answers, themes), and Previous/Next within the current filter. Back returns to the gallery with the same filters.
- Before phase 8 the AI card says 'AI version not made yet'; an admin can still edit the staff report (the original text is kept in the activity log).
- Download folder writes Program/District/Panchayat/Village folders plus _metadata.csv (Chrome/Edge) or a ZIP in parts (other browsers), for photos stored on R2 and on Google Drive.
- Bulk edit changes program/village/consent on selected photos and logs it.
