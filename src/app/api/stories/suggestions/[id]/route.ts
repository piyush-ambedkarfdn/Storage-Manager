import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import { createStory } from "@/lib/stories/queries";
import { suggestionActionSchema } from "@/lib/schemas/story";
import type { StorySuggestion } from "@/types/story";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { action: "accept" | "dismiss" } (admin). Accept creates a draft linked to the suggestion's reports. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Suggestion not found.");
  const { action } = await parseBody(suggestionActionSchema, req);
  const { data } = await session.supabase.from("story_suggestions").select("*").eq("id", id).maybeSingle();
  const s = data as StorySuggestion | null;
  if (!s) throw new ApiError(404, "Suggestion not found.");
  if (s.status !== "new") throw new ApiError(409, "This suggestion was already handled.");

  if (action === "dismiss") {
    const { error } = await session.supabase.from("story_suggestions").update({ status: "dismissed" }).eq("id", id);
    if (error) throw toApiError(error);
    return { ok: true };
  }
  const story = await createStory(session, {
    kind: s.kind,
    title: s.title,
    source_report_ids: s.report_ids,
    theme_ids: s.theme_ids,
    language: "en",
    status: "draft",
  });
  if (s.problem || s.why_now) {
    await session.supabase.from("stories").update({ summary: [s.problem, s.why_now ? `Why now: ${s.why_now}` : null].filter(Boolean).join(" ") }).eq("id", story.id);
  }
  const { error } = await session.supabase.from("story_suggestions").update({ status: "accepted", story_id: story.id }).eq("id", id);
  if (error) throw toApiError(error);
  return { storyId: story.id };
});
