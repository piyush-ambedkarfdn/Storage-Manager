import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { analyseReport } from "@/lib/ai/jobs";
import { assertAiReady } from "@/lib/ai/safety";

export const maxDuration = 60;

/** POST { reportId }: called by the upload queue when a batch finishes. Staff: own reports only. Once per report. */
export const POST = handle(async (req) => {
  assertAiReady();
  const { profile, supabase } = await assertUser();
  const { reportId } = await parseBody(z.object({ reportId: z.uuid() }), req);
  const { data } = await supabase.from("field_reports").select("id, uploaded_by").eq("id", reportId).maybeSingle();
  if (!data || (profile.role !== "admin" && data.uploaded_by !== profile.id)) throw new ApiError(404, "Report not found.");
  return analyseReport(reportId);
});
