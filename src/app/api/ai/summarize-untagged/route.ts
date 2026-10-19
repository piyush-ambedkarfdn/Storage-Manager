import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { analyseReport } from "@/lib/ai/jobs";
import { assertAiReady } from "@/lib/ai/safety";

export const maxDuration = 60;

/** GET (admin): field reports without an AI version yet (e.g. uploaded before phase 8). */
export const GET = handle(async () => {
  const { supabase } = await assertAdmin();
  const { count } = await supabase.from("field_reports").select("id", { count: "exact", head: true }).is("ai_processed_at", null);
  return { remaining: count ?? 0 };
});

/** POST { limit } (admin): process the next few, one Lite call each. */
export const POST = handle(async (req) => {
  assertAiReady();
  const { supabase } = await assertAdmin();
  const { limit } = await parseBody(z.object({ limit: z.number().int().min(1).max(8).default(5) }), req);
  const { data } = await supabase.from("field_reports").select("id").is("ai_processed_at", null).order("created_at", { ascending: false }).limit(limit);
  let done = 0;
  let failed = 0;
  for (const r of data ?? []) {
    try {
      await analyseReport(r.id as string);
      done++;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) throw err;
      failed++;
    }
  }
  const { count } = await supabase.from("field_reports").select("id", { count: "exact", head: true }).is("ai_processed_at", null);
  return { done, failed, remaining: count ?? 0 };
});
