import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { joinReport } from "@/lib/schemas/report";
import { updateReportSchema } from "@/lib/schemas/photo-detail";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH { report_parts?, theme_ids?, beneficiary_count? } (admin): fix the staff report.
 * The text before the change is kept in the activity log (report_edited). AI fields are untouched.
 */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Report not found.");
  const input = await parseBody(updateReportSchema, req);

  const { data: before } = await supabase
    .from("field_reports")
    .select("report_parts, report, theme_ids, beneficiary_count")
    .eq("id", id)
    .maybeSingle();
  if (!before) throw new ApiError(404, "Report not found.");

  if (input.theme_ids) {
    const { data: themes } = await supabase.from("calendar_options").select("id").eq("type", "theme").in("id", input.theme_ids);
    if ((themes ?? []).length !== input.theme_ids.length) throw new ApiError(400, "One of the chosen themes no longer exists.");
  }
  const patch: Record<string, unknown> = { ...input };
  if (input.report_parts) patch.report = joinReport(input.report_parts);

  const { error } = await supabase.from("field_reports").update(patch).eq("id", id);
  if (error) throw toApiError(error);
  await logActivity({ action: "report_edited", entityType: "field_report", entityId: id, detail: { before, after: input } });
  return { ok: true };
});
