import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { normalizeConfig } from "@/lib/program-form/rules";
import { REPORT_PART_KEYS } from "@/types/report";

type Ctx = { params: Promise<{ programId: string }> };

const bodySchema = z.object({ report_parts: z.array(z.enum(REPORT_PART_KEYS)).max(4), ask_themes: z.boolean() });

/** PUT { report_parts, ask_themes } (admin): which questions this program's upload form asks. */
export const PUT = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const { programId } = await ctx.params;
  if (!z.uuid().safeParse(programId).success) throw new ApiError(404, "This program does not exist.");
  const input = await parseBody(bodySchema, req);
  const cfg = normalizeConfig(input);
  const { error } = await supabase
    .from("program_form_config")
    .upsert({ program_id: programId, report_parts: cfg.report_parts, ask_themes: cfg.ask_themes, updated_at: new Date().toISOString() });
  if (error) throw toApiError(error);
  await logActivity({ action: "option_changed", entityType: "program", entityId: programId, detail: { op: "form_config", report_parts: cfg.report_parts, ask_themes: cfg.ask_themes } });
  return { config: cfg };
});
