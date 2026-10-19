# Phase 8: Gemini

Server-side AI on the Gemini API FREE tier: one Flash-Lite call per report writes the summary, problems, suggested themes and the improved (clear English, optional Hindi) version of the staff report; photo descriptions for consented photos; captions, hashtags, CTA, briefs, ideas, month plan and day suggestions within a small daily budget. The UI already exists from earlier phases and switches on with the feature flag.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Create a free Gemini API key in Google AI Studio (no billing needed). Do NOT enable billing on that Google Cloud project: the app is built to stay inside the free tier.
2. Set GEMINI_API_KEY, GEMINI_MODEL_LITE (bulk work, default gemini-3.5-flash-lite) and GEMINI_MODEL (writing, default gemini-3.8-flash). Check the models page and your project's live limits in AI Studio (Usage and limits), then set GEMINI_DAILY_LIMIT, GEMINI_DAILY_LIMIT_LITE and GEMINI_RPM a little below them.
3. Read the free-tier privacy note in the README: Google may use free-tier prompts to improve its products, so the app removes phone numbers and personal names from reports and only sends thumbnails of photos with consent = yes and no children.

## Install

```
npm i @google/genai
```

## Env values

`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODEL_LITE`, `GEMINI_DAILY_LIMIT`, `GEMINI_DAILY_LIMIT_LITE`, `GEMINI_RPM`

## Files added

- src/app/api/ai/describe/route.ts
- src/app/api/ai/summarize-report/route.ts
- src/app/api/ai/suggest-themes/route.ts
- src/app/api/ai/improve-report/route.ts
- src/app/api/ai/caption/route.ts
- src/app/api/ai/hashtags/route.ts
- src/app/api/ai/cta/route.ts
- src/app/api/ai/brief/route.ts
- src/app/api/ai/ideas/route.ts
- src/app/api/ai/month-plan/route.ts
- src/app/api/ai/days/route.ts
- src/app/api/ai/name-check/route.ts
- src/app/api/ai/describe-untagged/route.ts
- src/app/api/ai/summarize-untagged/route.ts
- src/app/admin/ai/page.tsx
- src/components/ai/DescribeUntaggedCard.tsx
- src/components/ai/SummarizeUntaggedCard.tsx
- src/components/ai/AiUsageCard.tsx
- src/lib/gemini.ts
- src/lib/ai/org-context.ts
- src/lib/ai/prompts.ts
- src/lib/ai/schemas.ts
- src/lib/ai/safety.ts
- src/lib/ai/throttle.ts
- src/lib/ai/report-context.ts
- src/lib/ai/redact.ts
- src/lib/ai/jobs.ts
- src/lib/i18n/messages/ai.ts

## Files replaced (full file, overwrite)

- src/config/features.ts
- src/components/calendar/AiAssistPanel.tsx

## Check it works

- AI tools appears in the sidebar and shows today's budget for both models, the per-minute count and the privacy note.
- Upload a batch: when the queue finishes, its field report gets an AI version (draft) from ONE Flash-Lite request; consented photos without children get a description; others get none.
- Photo page: the 'Improved by AI' tab shows the clearer English (and Hindi after 'Improve again' with Hindi); Accept / Edit then accept / Reject work; the staff text never changes.
- AI tools: 'Field reports without an AI version' and 'Photos without a description' process old uploads in small batches and stop when the daily budget is used.
- Calendar: New item > caption ideas from the reports, brief, hashtags, CTA, recommended days; 'Ideas with AI' adds Idea posts with photos attached.
- When the Flash budget is used up the caption buttons still work and say 'Written with the lighter model'; when everything is used up they say the budget is used for today.
- In dev, a report containing a phone number and 'Smt. <name>' is sent with [phone] and [name] (check the server log or add a console.log in redact.ts).
- Upload form: 'Suggest from report' fills problem themes.
