import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { reviewSchema } from "@/lib/schemas/photo-detail";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST { action: "accept" | "reject", text? } (admin): review the AI version of a report.
 * "accept" with text saves the admin's edited version as the accepted text. Staff text never changes.
 * Only accepted AI text is used as-is by captions and stories (phase 8 and 9).
 */
export const POST = handle<Ctx>(async (req, ctx) => {
  const { profile, supabase } = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Report not found.");
  const { action, text } = await parseBody(reviewSchema, req);

  const { data: before } = await supabase.from("field_reports").select("ai_report_en, ai_review_status").eq("id", id).maybeSingle();
  if (!before) throw new ApiError(404, "Report not found.");
  if (!before.ai_report_en && !text) throw new ApiError(409, "There is no AI version of this report yet.");

  const patch: Record<string, unknown> = {
    ai_review_status: action === "accept" ? "accepted" : "rejected",
    ai_reviewed_by: profile.id,
    ai_reviewed_at: new Date().toISOString(),
  };
  if (action === "accept" && text && text !== before.ai_report_en) patch.ai_report_en = text;

  const { error } = await supabase.from("field_reports").update(patch).eq("id", id);
  if (error) throw toApiError(error);
  await logActivity(
    action === "accept"
      ? { action: "report_ai_accepted", entityType: "field_report", entityId: id, detail: { edited: !!patch.ai_report_en, before: patch.ai_report_en ? before.ai_report_en : undefined } }
      : { action: "report_edited", entityType: "field_report", entityId: id, detail: { ai: "rejected" } },
  );
  return { ok: true };
});
