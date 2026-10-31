# Activity types and upload form per program

## Apply
1. Supabase SQL editor: run `supabase/migrations/0017_program_activity_types.sql` (safe to run twice).
   - GOONJ: its 14 "Type of Activity in CFW initiative" values become GOONJ's activity types (step 1).
     Photos already uploaded with a CFW activity get the matching activity type. The old step-2 CFW category is hidden, not deleted.
   - Meeting/Workshop (found by name): Governance, Finance, Other workshops; no report questions and no problem themes.
     If the program is named differently the SQL prints a notice: set it up in Settings > Programs instead.
   - The Program tab now groups by the photo's activity type (function program_tree changed).
2. Unzip over the project root. No new packages. Restart `npm run dev`.

## Use
- Settings > Programs > each program > "Activity types & form":
  add, rename, recolour, reorder, hide activity types for that program, and switch report questions / problem themes on or off.
- Settings > Lists > "General activity types": offered by programs that have no types of their own.
- Upload step 1: choosing the program shows that program's activity types and only the questions it asks.
