import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { STORY_COLUMNS, type Story } from "@/types/story";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST (admin): turns the campaign plan's posts into Idea posts in the calendar (first status and stage),
 * linked back with source_story_id and carrying the story's consented photos. Posts already created are skipped by title.
 */
export const POST = handle<Ctx>(async (_req, ctx) => {
  const { profile, supabase } = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This story does not exist.");
  const { data } = await supabase.from("stories").select(STORY_COLUMNS).eq("id", id).maybeSingle();
  const story = data as Story | null;
  if (!story) throw new ApiError(404, "This story does not exist.");
  const posts = story.plan?.posts ?? [];
  if (!posts.length) throw new ApiError(409, "The plan has no posts yet.");

  const [{ data: statuses }, { data: stages }, { data: existing }, { data: photoRows }] = await Promise.all([
    supabase.from("calendar_options").select("value").eq("type", "status").order("sort_order").limit(1),
    supabase.from("calendar_options").select("value").eq("type", "stage").order("sort_order").limit(1),
    supabase.from("content_items").select("title").eq("source_story_id", id),
    supabase.from("story_photos").select("photo_id, photo:photos(consent)").eq("story_id", id).order("sort_order"),
  ]);
  const have = new Set((existing ?? []).map((e) => e.title as string));
  const photoIds = ((photoRows ?? []) as unknown as { photo_id: string; photo: { consent: string } | null }[])
    .filter((p) => p.photo?.consent === "yes")
    .map((p) => p.photo_id)
    .slice(0, 4);

  let created = 0;
  for (const p of posts) {
    if (have.has(p.title)) continue;
    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        title: p.title,
        content_brief: p.brief,
        platform: p.platform || null,
        content_format: p.format || null,
        content_pillar: p.pillar || null,
        publish_date: p.date,
        awareness_day: p.awareness_day,
        status: statuses?.[0]?.value ?? "Idea",
        production_stage: stages?.[0]?.value ?? "Not started",
        source_story_id: id,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error) throw toApiError(error);
    if (photoIds.length) await supabase.from("content_item_photos").insert(photoIds.map((photo_id, i) => ({ content_item_id: item.id, photo_id, sort_order: i })));
    created++;
  }
  await logActivity({ action: "content_created", entityType: "story", entityId: id, detail: { from_campaign: created } });
  return { created };
});
