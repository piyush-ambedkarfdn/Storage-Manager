import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { generateJson } from "@/lib/gemini";
import { system, themesBlock } from "@/lib/ai/prompts";
import { loadRecentReports, reportsBlock, reportText, themeCodesToIds, themeList, type ReportForPrompt } from "@/lib/ai/report-context";
import { reportsByIds } from "@/lib/stories/queries";
import { activityLabel } from "@/config/activity-types";
import { redactReport } from "@/lib/ai/redact";
import { staffNames } from "@/lib/ai/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { toApiError } from "@/lib/options";
import { STORY_COLUMNS, type Story } from "@/types/story";
import { planSchema } from "@/lib/schemas/story";

/**
 * Story and campaign AI (phase 9), on the free tier through generateJson (budget, fallback, redaction).
 * Facts come only from the linked field reports; gaps are written as [confirm: …].
 */

const KIND_GUIDE = {
  impact_story: "An impact story for our website, 400-700 words: one person or community, what changed and why it matters. Warm, specific, never pitying.",
  case_study: "A case study for our website with Markdown headings: Context, The problem, What we did, Results, Lessons, What is still needed.",
  campaign: "A campaign page (300-500 words in Markdown) explaining the problem and what we ask people to do, PLUS a campaign plan: goal, audience, key messages, channels, timeline, calls to action, hashtags, and 6-12 calendar posts (title, platform, format, pillar, brief, date YYYY-MM-DD, awareness day or empty).",
} as const;

const TONE = { warm: "warm and human", formal: "formal, for partners and funders", simple: "very simple words, short sentences" } as const;

const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        kind: z.enum(["impact_story", "case_study", "campaign"]),
        title: z.string(),
        problem: z.string(),
        places: z.string().describe("Where it was reported, e.g. '6 villages in Chatra and Giridih'"),
        why_now: z.string().describe("Why now: a season, an awareness day, a deadline, or empty"),
        rationale: z.string(),
        report_codes: z.array(z.string()).min(1).max(12),
        theme_codes: z.array(z.string()).max(3),
        window: z.string().describe("Suggested time to publish, e.g. 'before 26 Nov (Constitution Day)'"),
      }),
    )
    .max(8),
});

const draftOutSchema = z.object({
  title: z.string(),
  summary: z.string().describe("Two sentences for a page preview"),
  body_md: z.string().describe("Markdown. Missing facts as [confirm: …]. No raw HTML."),
  plan: planSchema.nullable().describe("Only for a campaign, else null"),
});

const refineOutSchema = z.object({ body_md: z.string(), summary: z.string() });

/** Recent reports (summaries and places, already redacted) → suggestions stored in story_suggestions. */
export async function suggestStories(session: Session, days: number): Promise<number> {
  const reports = await loadRecentReports(days, 40);
  if (reports.length < 1) throw new ApiError(409, "There are no field reports in this period to suggest stories from.");
  const themes = await themeList();
  const { data } = await generateJson({
    kind: "flash",
    purpose: "story-suggestions",
    system: await system(`
Recommend up to 6 pieces for our website from these field reports.
- A problem reported in several villages or by several reports → a campaign.
- One rich report with a clear result → an impact story; a well-documented piece of work with lessons → a case study.
For each: kind, title, the problem in one or two sentences, where it was reported, why now (season, awareness day, deadline), a short rationale,
the codes of the supporting reports, 1-3 theme codes, and a suggested window. Use only what the reports say.`),
    input: `Problem themes:\n${themesBlock(themes)}\n\nField reports:\n${reportsBlock(reports)}`,
    schema: suggestionsSchema,
  });
  const rows = data.suggestions.map((s) => ({
    kind: s.kind,
    title: s.title.slice(0, 200),
    problem: s.problem,
    places: s.places,
    why_now: s.why_now || null,
    rationale: s.rationale,
    report_ids: s.report_codes.map((c) => reports.find((r) => r.code === c)?.id).filter((x): x is string => !!x),
    theme_ids: themeCodesToIds(s.theme_codes, themes),
    suggested_window: s.window || null,
  }));
  if (rows.length) {
    const { error } = await session.supabase.from("story_suggestions").insert(rows);
    if (error) throw toApiError(error);
  }
  await logActivity({ action: "story_suggestions_generated", detail: { count: rows.length, days } });
  return rows.length;
}

async function storyReports(session: Session, story: Story): Promise<ReportForPrompt[]> {
  // the linked reports; if none are linked, the reports behind the story's photos
  let ids = story.source_report_ids;
  if (!ids.length) {
    const { data } = await createAdminClient().from("story_photos").select("photo:photos(report_id)").eq("story_id", story.id);
    ids = [...new Set(((data ?? []) as unknown as { photo: { report_id: string | null } | null }[]).map((d) => d.photo?.report_id).filter((x): x is string => !!x))];
  }
  if (!ids.length) throw new ApiError(409, "Link at least one field report (or add photos that have reports) before asking AI to write.");
  const [rows, names, themes] = await Promise.all([reportsByIds(session, ids), staffNames(), themeList()]);
  return rows.map((r, i) => {
    const accepted = r.ai_review_status === "accepted" && r.ai_report_en;
    return {
      code: `R${i + 1}`,
      id: r.id,
      text: accepted ? redactReport(r.ai_report_en, { knownNames: names }) : reportText(r.report_parts, r.report, names),
      place: r.place_path,
      activity: activityLabel(r.activity_type),
      date: r.event_date,
      themes: r.theme_ids.map((t) => themes.find((x) => x.id === t)?.name).filter((x): x is string => !!x),
      program: null,
    };
  });
}

async function saveAiText(session: Session, story: Story, patch: Record<string, unknown>, action: "story_updated") {
  const { data, error } = await session.supabase
    .from("stories")
    .update({
      ...patch,
      ai_generated: true,
      reviewed_by: null,
      reviewed_at: null,
      // new AI text must be reviewed again
      status: story.status === "ready" || story.status === "published" ? "draft" : story.status === "idea" ? "draft" : story.status,
    })
    .eq("id", story.id)
    .select(STORY_COLUMNS)
    .single();
  if (error) throw toApiError(error);
  await logActivity({ action, entityType: "story", entityId: story.id, detail: { ai: true, fields: Object.keys(patch) } });
  return data as Story;
}

async function loadStory(session: Session, id: string): Promise<Story> {
  const { data } = await session.supabase.from("stories").select(STORY_COLUMNS).eq("id", id).maybeSingle();
  if (!data) throw new ApiError(404, "This story does not exist.");
  return data as Story;
}

export async function draftStory(session: Session, id: string, language: "en" | "hi", tone: keyof typeof TONE): Promise<Story> {
  const story = await loadStory(session, id);
  const reports = await storyReports(session, story);
  const { data: photos } = await session.supabase.from("story_photos").select("photo:photos(consent, has_children, ai_description)").eq("story_id", id);
  const photoNotes = ((photos ?? []) as unknown as { photo: { consent: string; has_children: boolean; ai_description: string | null } | null }[])
    .map((p) => p.photo)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => `- ${p.ai_description ?? "photo"} (consent: ${p.consent}${p.has_children ? ", children" : ""})`)
    .join("\n");
  const { data } = await generateJson({
    kind: "flash",
    purpose: "story-draft",
    system: await system(`
Write this for our website: ${KIND_GUIDE[story.kind]}
Language: ${language === "hi" ? "Hindi (Devanagari)" : "English"}. Tone: ${TONE[tone]}.
Use only facts in the field reports. Quote a person only if the report contains the quote AND a photo of theirs has consent "yes"; otherwise no quotes.
No identifying details of children. No medical, legal or political claims beyond what the reports state. Mark every missing fact as [confirm: …].`),
    input: `Working title: ${story.title}\n\nField reports:\n${reportsBlock(reports)}\n\nPhotos attached:\n${photoNotes || "none"}`,
    schema: draftOutSchema,
  });
  return saveAiText(
    session,
    story,
    {
      title: data.title.slice(0, 200) || story.title,
      summary: data.summary,
      body_md: data.body_md,
      language,
      plan: story.kind === "campaign" ? data.plan : story.plan,
    },
    "story_updated",
  );
}

export async function refineStory(session: Session, id: string, instruction: string): Promise<Story> {
  const story = await loadStory(session, id);
  if (!story.body_md.trim()) throw new ApiError(409, "Write or generate a draft first.");
  const names = await staffNames();
  const { data } = await generateJson({
    kind: "flash",
    purpose: "story-refine",
    system: await system(`Edit this ${story.kind.replace("_", " ")} following the instruction. Keep the same facts; do not add new facts; keep [confirm: …] markers unless the instruction gives the fact.`),
    input: `Instruction: ${redactReport(instruction, { knownNames: names })}\n\nCurrent text (Markdown):\n${redactReport(story.body_md, { knownNames: names })}`,
    schema: refineOutSchema,
  });
  return saveAiText(session, story, { body_md: data.body_md, summary: data.summary }, "story_updated");
}
