import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadRecentReports, reportsBlock } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { ideasSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

/**
 * POST { month: "YYYY-MM", count } (admin): reads recent field reports and adds posts as Ideas
 * (first status and stage), each with the consented photos of its report attached.
 */
export const POST = handle(async (req) => {
  assertAiReady();
  const { profile, supabase } = await assertAdmin();
  const { month, count } = await parseBody(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), count: z.number().int().min(1).max(10) }), req);
  const reports = await loadRecentReports(60, 25);
  if (!reports.length) throw new ApiError(409, "There are no field reports from the last 60 days to build ideas from.");

  const { data } = await generateJson({
    kind: "flash",
    purpose: "ideas",
    system: await system(TASKS.ideas(count, month)),
    input: `Field reports:\n${reportsBlock(reports)}`,
    schema: ideasSchema,
  });

  const [{ data: statuses }, { data: stages }] = await Promise.all([
    supabase.from("calendar_options").select("value").eq("type", "status").order("sort_order").limit(1),
    supabase.from("calendar_options").select("value").eq("type", "stage").order("sort_order").limit(1),
  ]);
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  let created = 0;
  for (const idea of data.ideas.slice(0, count)) {
    const report = reports.find((r) => r.code === idea.report_code);
    const day = String(Math.min(Math.max(idea.day, 1), lastDay)).padStart(2, "0");
    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        title: idea.title.slice(0, 200),
        content_brief: idea.brief,
        publish_date: `${month}-${day}`,
        status: statuses?.[0]?.value ?? "Idea",
        production_stage: stages?.[0]?.value ?? "Not started",
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !item) continue;
    created++;
    if (report) {
      const { data: photos } = await supabase
        .from("photos")
        .select("id")
        .eq("report_id", report.id)
        .eq("status", "active")
        .eq("consent", "yes")
        .limit(6);
      if (photos?.length) {
        await supabase.from("content_item_photos").insert(photos.map((p, i) => ({ content_item_id: item.id, photo_id: p.id, sort_order: i })));
      }
    }
  }
  await logActivity({ action: "content_created", entityType: "content_item", detail: { ai_ideas: created, month } });
  return { created };
});
