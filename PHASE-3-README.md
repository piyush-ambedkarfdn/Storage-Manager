# Phase 3: Places, names and dropdown options

Programs, LGD place import (CSV or Excel), pending names and merge tool, admin-managed dropdown options including problem themes, activity types shown from code.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0002_places_options.sql, then supabase/seed.sql, in the Supabase SQL editor.
2. On lgdirectory.gov.in open Download Directory and download the village–panchayat–block mapping for Jharkhand as CSV or Excel (.xlsx; old .xls files must be re-saved as .xlsx or CSV). Then in Settings > Places choose the file, tick Chatra, Giridih and Hazaribagh, press Preview, then Import.

## Database

Run `supabase/migrations/0002_places_options.sql` in the Supabase SQL editor.

## Install

```
npm i papaparse read-excel-file
npm i -D @types/papaparse
```

## Files added

- supabase/migrations/0002_places_options.sql
- supabase/seed.sql
- src/app/admin/settings/page.tsx
- src/app/api/places/route.ts
- src/app/api/places/[level]/[id]/route.ts
- src/app/api/places/merge/route.ts
- src/app/api/places/import-lgd/preview/route.ts
- src/app/api/places/import-lgd/commit/route.ts
- src/app/api/names/similar/route.ts
- src/app/api/options/route.ts
- src/app/api/options/[id]/route.ts
- src/app/api/programs/route.ts
- src/app/api/programs/[id]/route.ts
- src/components/settings/SettingsTabs.tsx
- src/components/settings/PlacesTable.tsx
- src/components/settings/LgdImportCard.tsx
- src/components/settings/PendingNamesTable.tsx
- src/components/settings/MergeDialog.tsx
- src/components/settings/OptionsOverview.tsx
- src/components/settings/ManageOptionsDialog.tsx
- src/components/settings/ProgramsManager.tsx
- src/components/settings/ActivityTypesCard.tsx
- src/lib/lgd/types.ts
- src/lib/lgd/parse.ts
- src/lib/lgd/import.ts
- src/lib/names.ts
- src/lib/options.ts
- src/hooks/useOptions.ts
- src/hooks/usePlaces.ts
- src/lib/schemas/places.ts
- src/lib/schemas/options.ts
- src/types/places.ts
- src/types/options.ts
- src/lib/i18n/messages/settings.ts

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- Settings appears in the sidebar with four tabs: Places, Names to review, Lists, Programs.
- Import the LGD file: the districts in the file are listed (yours ticked), Preview shows counts per level and saves nothing, Import creates districts, blocks, panchayats and villages with LGD codes. Running it again shows everything as 'Already linked'.
- A place added by hand earlier with the same spelling (or Chatra vs Chhatra) is linked to its LGD code instead of duplicated.
- Renaming or recolouring a status in Manage lists updates the Lists table straight away; hidden values show as 'n hidden'.
- Problem themes are listed (seeded) and can be added, renamed, recoloured, reordered and hidden.
- Merge into…: typing a near-duplicate name suggests the existing one; after merging, the old spelling is found by /api/names/similar with score 1.
- Activity types show as read-only chips with the path src/config/activity-types.ts.
- Staff accounts: the Edit dialog now shows district and program boxes.
