# storage-org: photo organiser and content calendar

A web app for the organisation. Field staff upload photos with a short field report; admins browse them
in a folder tree, open each photo's detail page (what staff wrote plus a clearer AI version), download
them into folders, plan social posts, and draft stories and campaigns from the reports.

**It is free to run.** Every part uses a free tier: Supabase (database and login), Cloudflare R2 and/or
Google Drive (photo storage), the Gemini API free tier (AI), and a free hosting plan. The app keeps itself
inside those limits: it warns at 70% of storage, blocks uploads at 95%, and keeps a daily AI budget.

## Stack
Next.js 16 (`src/` folder, `src/proxy.ts`), React 19, Tailwind CSS 4, shadcn/ui, Supabase, TypeScript (strict).

## How the code arrives: one zip per phase
Each zip contains **only the files that are new or changed in that phase**. Unzip it over the project root,
run its migration, install what its README lists, and check the "Check it works" list before the next phase.

| Phase | What it adds | Migration |
|---|---|---|
| 1 | Foundation and auth (this zip) | 0001 |
| 2 | Staff accounts | – |
| 3 | Places (LGD import), names, dropdown options, problem themes | 0002 + seed |
| 4 | Upload with field report, Cloudflare R2 / Google Drive storage | 0003 |
| 5 | Gallery, photo detail page, structured download | 0004 |
| 6 | Content calendar, dashboard, days to plan around | 0005 |
| 7 | Storage manager (cleanup, trash, move between storages) | 0006 |
| 8 | Gemini (free tier): improved reports, descriptions, captions, ideas | – |
| 9 | Stories, case studies and campaigns | 0007 |
| 10 | Staff activity and PWA install | 0008 |

## Phase 1 setup
1. Node.js 20.9 or newer.
2. `npx create-next-app@latest storage-org-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
3. `npx shadcn@latest init` (choose **Radix** if asked), then
   `npx shadcn@latest add button input label select textarea dialog dropdown-menu tabs table badge checkbox switch sonner tooltip skeleton card separator sheet popover command radio-group scroll-area`
4. `npm i @supabase/supabase-js @supabase/ssr next-themes zod react-hook-form @hookform/resolvers @tanstack/react-query lucide-react date-fns server-only tw-animate-css`
5. Unzip this phase over the project (it replaces `layout.tsx`, `globals.css`, `page.tsx`, `next.config.ts`).
6. Create a free Supabase project. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up".
7. `cp .env.example .env.local` and fill the Supabase values.
8. Run `supabase/migrations/0001_foundation.sql` in the Supabase SQL editor.
9. Create the first admin: Authentication > Users > Add user (auto-confirm), copy its id, then run
   `insert into profiles (id, full_name, role, must_change_password) values ('<user uuid>', 'Your name', 'admin', false);`
10. `npm run dev` and open http://localhost:3000.

## Staying free
- **Supabase free** pauses a project after about a week with no activity. Once the app is in daily use this does
  not happen; before that, open the app or let a scheduled job ping it weekly.
- **Cloudflare R2 free**: 10 GB storage, 1M writes and 10M reads a month, free downloads. The app sums file sizes
  in the database instead of listing the bucket, so checking usage costs nothing.
- **Google Drive**: 15 GB shared with Gmail on the organisation's account.
- **Gemini API free tier**: limited requests per minute and per day, set per Google Cloud project (check
  AI Studio > Usage and limits). The app uses the cheap Flash-Lite model for bulk work, one call per field report,
  and stops at the daily budget in `.env.local`. **Privacy:** on the free tier Google may use prompts to improve
  its products, so the app removes phone numbers and personal names before sending report text, and only sends
  small thumbnails of photos with consent "yes" and no children. Never paste sensitive personal data into AI fields.
- **Hosting**: any free Next.js host works. Vercel's free Hobby plan is meant for non-commercial use; read its
  terms for your organisation. The daily purge (phase 7) can run as a free scheduled GitHub Action instead of a
  Vercel cron.

## Rules the code follows
- Storage only through `src/lib/storage/` (phase 4). Secrets never reach the browser.
- Row-level security on every table; admin checks use `is_admin()`. The secret key is server-only.
- AI text is always a draft until an admin accepts it; staff text is never overwritten by AI.
- Photos without consent "yes" never appear in public-facing suggestions.
