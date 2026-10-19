# Phase 6: Content calendar, dashboard and days to plan around

Calendar table and month view, New item dialog, option editing in place, admin dashboard, and a panel of national and international days (built-in list plus the admin's own days) to plan posts around. AI buttons are present but hidden until phase 8.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0005_content_calendar.sql in the Supabase SQL editor (after 0004). No new packages are needed.

## Database

Run `supabase/migrations/0005_content_calendar.sql` in the Supabase SQL editor.

## Files added

- supabase/migrations/0005_content_calendar.sql
- src/app/admin/calendar/page.tsx
- src/app/api/content/route.ts
- src/app/api/content/[id]/route.ts
- src/app/api/content/[id]/photos/route.ts
- src/app/api/content/summary/route.ts
- src/app/api/days/route.ts
- src/app/api/days/custom/route.ts
- src/app/api/days/custom/[id]/route.ts
- src/app/api/days/hidden/route.ts
- src/components/calendar/CalendarView.tsx
- src/components/calendar/CalendarToolbar.tsx
- src/components/calendar/CalendarTable.tsx
- src/components/calendar/CalendarMonthView.tsx
- src/components/calendar/NewItemDialog.tsx
- src/components/calendar/ItemPanel.tsx
- src/components/calendar/PhotoStrip.tsx
- src/components/calendar/ConsentWarnings.tsx
- src/components/calendar/OptionSelect.tsx
- src/components/calendar/AiAssistPanel.tsx
- src/components/calendar/IdeasDialog.tsx
- src/components/calendar/ReportContext.tsx
- src/components/calendar/DaysPanel.tsx
- src/components/calendar/DayCard.tsx
- src/components/calendar/CustomDayDialog.tsx
- src/components/dashboard/DashboardView.tsx
- src/components/dashboard/StageCards.tsx
- src/components/dashboard/PlatformBars.tsx
- src/components/dashboard/ActivityBars.tsx
- src/components/dashboard/ThemeBars.tsx
- src/components/dashboard/UpcomingList.tsx
- src/components/dashboard/UpcomingDays.tsx
- src/components/dashboard/OverdueList.tsx
- src/components/dashboard/LibraryStats.tsx
- src/components/dashboard/StorageSummary.tsx
- src/config/awareness-days.ts
- src/hooks/useContentItems.ts
- src/hooks/useDays.ts
- src/lib/content/queries.ts
- src/lib/days/upcoming.ts
- src/lib/schemas/content.ts
- src/lib/schemas/days.ts
- src/types/content.ts
- src/types/days.ts
- src/lib/i18n/messages/calendar.ts
- src/lib/i18n/messages/dashboard.ts

## Files replaced (full file, overwrite)

- src/config/features.ts
- src/app/admin/page.tsx
- src/app/api/gallery/tree/route.ts

## Check it works

- The sidebar shows Content calendar, and /admin is now the dashboard.
- In the gallery select photos and press Add to calendar: New item opens with them attached, their field reports shown, and a title such as 'Training in Village 1'.
- A photo with consent No / Not sure or with children shows a warning; saving needs the photo removed or the 'I have checked' box ticked.
- The Days panel lists the next 60 days (30/60/90/180) with National / International / Custom chips and a Hindi names button; Plan a post opens New item with that day's date and name.
- Add custom day (e.g. a local festival, every year or one year only); hide a built-in day and bring it back with 'Show hidden'.
- Table view: click any cell to edit it in place. Month view: drag a post to another day.
- Edit list beside a dropdown opens the list manager; renaming a status renames it on existing posts too.
- Dashboard: cards per stage, posts by platform, next 7 days, overdue, next 5 days to plan around, photos by activity, reports by theme, library numbers and storage.
- Gallery: 'Not used in calendar yet' filters the grid and the folder counts.
