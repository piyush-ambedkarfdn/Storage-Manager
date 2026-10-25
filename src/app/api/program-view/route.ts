import { z } from "zod";
import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import type { ProgramFieldSummary, ProgramSummary, ProgramTreeRow, ProgramViewData } from "@/types/program-view";

/**
 * GET ?program=<id>&field=<id> (admin): the programs with photo counts and, for the chosen program, its categories
 * and the Staff > Village > Activity counts (migration 0014). `field` is the category that becomes the Activity level;
 * by default the one called "...activity..." (for example "Type of Activity in CFW initiative"), else the first one.
 */
export const GET = handle(async (req): Promise<ProgramViewData> => {
  const { supabase } = await assertAdmin();
  const params = new URL(req.url).searchParams;

  const overview = await supabase.rpc("program_overview");
  if (overview.error) throw toApiError(overview.error);
  const programs = ((overview.data ?? []) as ProgramSummary[]).map((p) => ({ ...p, photo_count: Number(p.photo_count) }));

  const program = z.uuid().safeParse(params.get("program"));
  if (!program.success) return { programs, fields: [], fieldId: null, rows: [] };

  const fieldsRes = await supabase
    .from("program_fields")
    .select("id, label, label_hi")
    .eq("program_id", program.data)
    .eq("hidden", false)
    .order("sort_order")
    .order("created_at");
  if (fieldsRes.error) throw toApiError(fieldsRes.error);
  const fields = (fieldsRes.data ?? []) as ProgramFieldSummary[];

  const asked = z.uuid().safeParse(params.get("field"));
  const fieldId = (asked.success && fields.find((f) => f.id === asked.data)?.id) || fields.find((f) => /activity/i.test(f.label))?.id || fields[0]?.id || null;

  const tree = await supabase.rpc("program_tree", { p_program: program.data, p_field: fieldId });
  if (tree.error) throw toApiError(tree.error);
  return { programs, fields, fieldId, rows: (tree.data ?? []) as ProgramTreeRow[] };
});
