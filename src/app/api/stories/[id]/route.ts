import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { getStoryDetail } from "@/lib/stories/queries";
import { updateStorySchema } from "@/lib/schemas/story";
import { STORY_COLUMNS } from "@/types/story";

type Ctx = { params: Promise<{ id: string }> };
async function storyId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This story does not exist.");
  return id;
}

export const GET = handle<Ctx>(async (_req, ctx) => getStoryDetail(await assertAdmin(), await storyId(ctx)));

/**
 * PATCH (admin). `reviewed: true` records who reviewed the AI draft and when; editing the text keeps the
 * review. Marking ready/published is refused by the database when a photo has no consent or an AI draft
 * is not reviewed (guard_story_status); the message is shown as it is.
 */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { profile, supabase } = await assertAdmin();
  const id = await storyId(ctx);
  const { reviewed, ...input } = await parseBody(updateStorySchema, req);
  const patch: Record<string, unknown> = { ...input };
  if (reviewed === true) Object.assign(patch, { reviewed_by: profile.id, reviewed_at: new Date().toISOString() });
  if (reviewed === false) Object.assign(patch, { reviewed_by: null, reviewed_at: null });
  const { data, error } = await supabase.from("stories").update(patch).eq("id", id).select(STORY_COLUMNS).maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "This story does not exist.");
  await logActivity({ action: "story_updated", entityType: "story", entityId: id, detail: { fields: Object.keys(patch), status: input.status } });
  return { story: data };
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await storyId(ctx);
  const { data, error } = await supabase.from("stories").delete().eq("id", id).select("title");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "This story does not exist.");
  await logActivity({ action: "story_deleted", entityType: "story", entityId: id, detail: { title: data[0].title } });
  return { ok: true };
});
