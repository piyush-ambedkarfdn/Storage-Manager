import "server-only";
import { ApiError } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { generateJson } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/storage";
import { activityLabel } from "@/config/activity-types";
import { loadActivityTypes } from "@/lib/activity-types-server";
import { staffNames } from "@/lib/ai/org-context";
import { system, TASKS, themesBlock } from "@/lib/ai/prompts";
import { reportText, themeCodesToIds, themeList } from "@/lib/ai/report-context";
import { canSendImage } from "@/lib/ai/safety";
import { photoDescriptionSchema, reportAnalysisSchema } from "@/lib/ai/schemas";
import type { ProviderName } from "@/types/storage";
import type { ReportParts } from "@/types/report";

/**
 * The two jobs that write AI fields into the database. Writes use the service-role client after the
 * route has checked who may ask (staff for their own uploads, admins for everything).
 * Staff text (report, report_parts) is never written here.
 */

type Named = { name: string | null } | null;

/** ONE Flash-Lite call per report: summary, problems, themes, improved English (and Hindi when asked). */
export async function analyseReport(reportId: string, opts: { hindi?: boolean; style?: "shorter" | "formal"; force?: boolean } = {}) {
  await loadActivityTypes();
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("field_reports")
    .select("id, report, report_parts, activity_type, event_date, ai_processed_at, district:districts(name), village:villages(name)")
    .eq("id", reportId)
    .maybeSingle();
  if (!r) throw new ApiError(404, "Report not found.");
  if (r.ai_processed_at && !opts.force) return { skipped: true as const };

  const row = r as unknown as { report: string | null; report_parts: Partial<ReportParts> | null; activity_type: string | null; event_date: string | null; district: Named; village: Named };
  const [themes, names] = await Promise.all([themeList(), staffNames()]);
  const text = reportText(row.report_parts, row.report, names);
  if (!text.trim()) throw new ApiError(400, "The report is empty.");

  const { data, model } = await generateJson({
    kind: "lite",
    purpose: "report",
    system: await system(TASKS.analyseReport(!!opts.hindi, opts.style)),
    input: `Problem themes:\n${themesBlock(themes)}\n\nActivity: ${activityLabel(row.activity_type)} · Date: ${row.event_date ?? "unknown"} · Place: ${[row.district?.name, row.village?.name].filter(Boolean).join(" / ")}\n\nField report:\n${text}`,
    schema: reportAnalysisSchema,
  });

  const patch: Record<string, unknown> = {
    ai_summary: data.summary,
    ai_problems: data.problems,
    ai_theme_ids: themeCodesToIds(data.theme_codes, themes),
    ai_sections: data.sections,
    ai_report_en: data.report_en,
    ai_missing: data.missing,
    ai_model: model,
    ai_processed_at: new Date().toISOString(),
    ai_review_status: "draft",
    ai_reviewed_by: null,
    ai_reviewed_at: null,
  };
  if (opts.hindi) patch.ai_report_hi = data.report_hi || null;
  const { error } = await admin.from("field_reports").update(patch).eq("id", reportId);
  if (error) throw new ApiError(500, `Could not save the AI version: ${error.message}`);
  await logActivity({ action: opts.force ? "report_improved" : "report_summarized", entityType: "field_report", entityId: reportId, detail: { model, hindi: !!opts.hindi } });
  return { skipped: false as const, model };
}

/** Describe photos with a small thumbnail, only when consent is "yes" and there are no children. */
export async function describePhotos(photoIds: string[]): Promise<{ described: number; skipped: number; failed: number }> {
  await loadActivityTypes();
  const admin = createAdminClient();
  const { data } = await admin
    .from("photos")
    .select("id, storage_provider, thumb_key, consent, has_children, ai_description, ai_tags, activity_type, status")
    .in("id", photoIds);
  let described = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of (data ?? []) as { id: string; storage_provider: ProviderName; thumb_key: string; consent: string; has_children: boolean; ai_description: string | null; ai_tags: string[] | null; activity_type: string | null; status: string }[]) {
    if (p.status !== "active" || p.ai_description || !canSendImage(p)) {
      skipped++;
      continue;
    }
    try {
      const file = await getProvider(p.storage_provider).getBytes(p.thumb_key);
      const base64 = Buffer.from(await new Response(file.body).arrayBuffer()).toString("base64");
      const { data: out } = await generateJson({
        kind: "lite",
        purpose: "describe",
        system: await system(TASKS.describePhoto),
        input: [
          { type: "text", text: `Activity recorded by staff: ${activityLabel(p.activity_type)}.` },
          { type: "image", data: base64, mime_type: "image/jpeg" },
        ],
        schema: photoDescriptionSchema,
      });
      await admin
        .from("photos")
        .update({
          ai_description: out.description,
          ai_tags: out.tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
          ai_quality: out.quality,
          ai_suitable_for_social: out.suitable_for_social,
        })
        .eq("id", p.id);
      described++;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) throw err; // budget used: stop the batch
      // mark as tried (empty tags) so it is not retried in every batch
      await admin.from("photos").update({ ai_tags: [] }).eq("id", p.id).is("ai_tags", null);
      failed++;
    }
  }
  return { described, skipped, failed };
}
