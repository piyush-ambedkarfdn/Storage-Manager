import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertAdmin, type Session } from "@/lib/auth";
import { describePhotos } from "@/lib/ai/jobs";
import { assertAiReady } from "@/lib/ai/safety";

export const maxDuration = 60;

/** Photos that may be sent (consent yes, no children) and were never described or tried. */
async function remaining(supabase: Session["supabase"]): Promise<number> {
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("consent", "yes")
    .eq("has_children", false)
    .is("ai_description", null)
    .is("ai_tags", null);
  return count ?? 0;
}

/** GET (admin): how many photos still need a description. */
export const GET = handle(async () => {
  const { supabase } = await assertAdmin();
  return { remaining: await remaining(supabase) };
});

/** POST { limit } (admin): describe the next few (the page repeats it within the daily budget). */
export const POST = handle(async (req) => {
  assertAiReady();
  const { supabase } = await assertAdmin();
  const { limit } = await parseBody(z.object({ limit: z.number().int().min(1).max(8).default(5) }), req);
  const { data } = await supabase
    .from("photos")
    .select("id")
    .eq("status", "active")
    .eq("consent", "yes")
    .eq("has_children", false)
    .is("ai_description", null)
    .is("ai_tags", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (data ?? []).map((p) => p.id as string);
  const result = ids.length ? await describePhotos(ids) : { described: 0, skipped: 0, failed: 0 };
  return { ...result, remaining: await remaining(supabase) };
});
