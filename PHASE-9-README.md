# Phase 9: Stories and campaigns

AI-recommended and AI-drafted impact stories, case studies and campaigns for web pages, built from staff field reports and the problems they describe. Admin reviews, edits and exports (Markdown or HTML); campaign plans turn into calendar posts.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Run supabase/migrations/0007_stories.sql in the Supabase SQL editor (after 0001-0006).

## Database

Run `supabase/migrations/0007_stories.sql` in the Supabase SQL editor.

## Install

```
npm i react-markdown remark-gfm
```

## Files added

- supabase/migrations/0007_stories.sql
- src/app/admin/stories/page.tsx
- src/app/admin/stories/[id]/page.tsx
- src/app/api/stories/route.ts
- src/app/api/stories/[id]/route.ts
- src/app/api/stories/[id]/photos/route.ts
- src/app/api/stories/[id]/export/route.ts
- src/app/api/stories/[id]/calendar/route.ts
- src/app/api/stories/suggestions/route.ts
- src/app/api/stories/suggestions/[id]/route.ts
- src/app/api/ai/story-suggestions/route.ts
- src/app/api/ai/story-draft/route.ts
- src/app/api/ai/story-refine/route.ts
- src/components/stories/StoriesTabs.tsx
- src/components/stories/StoryList.tsx
- src/components/stories/StoryCard.tsx
- src/components/stories/SuggestionList.tsx
- src/components/stories/SuggestionCard.tsx
- src/components/stories/StoryEditor.tsx
- src/components/stories/MarkdownPreview.tsx
- src/components/stories/CampaignPlanPanel.tsx
- src/components/stories/SourceReportsPicker.tsx
- src/components/stories/StoryPhotoPicker.tsx
- src/components/stories/ConsentBlockers.tsx
- src/components/stories/ExportMenu.tsx
- src/components/stories/GenerateDialog.tsx
- src/lib/stories/queries.ts
- src/lib/stories/export.ts
- src/lib/stories/blockers.ts
- src/lib/ai/stories.ts
- src/lib/schemas/story.ts
- src/types/story.ts
- src/lib/i18n/messages/stories.ts

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- Stories and campaigns appears in the sidebar with Suggestions, Impact stories, Case studies and Campaigns.
- Find ideas from reports proposes stories, case studies and campaigns, each with the problem, where it was reported, why now and a suggested time.
- Draft it creates a draft linked to the reports; Write draft with AI fills it using only facts from those reports, with [confirm: …] for gaps.
- A story with a photo that has no consent cannot be set to Ready (the option is disabled and the database refuses it); Remove the photo and it can.
- An AI-written draft cannot be set to Ready until 'Mark as reviewed'; changing it with AI asks for a new review.
- Export gives a Markdown file, a standalone web page (HTML) and the photos as a folder download.
- A campaign's planned posts become Idea posts in the calendar, linked to the campaign.
- Photos used in a story are protected from trash and archive; the gallery's 'Used in a story' filter works.
