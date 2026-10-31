import { z } from "zod";
import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import type { ProgramSummary, ProgramTreeRow, ProgramViewData } from "@/types/program-view";

/**
 * GET ?program=<id> (admin): the programs with photo counts and, for the chosen program, the
 * Staff > Village > Activity type counts of its approved photos (migration 0017).
 */
export const GET = handle(async (req): Promise<ProgramViewData> => {
  const { supabase } = await assertAdmin();
  const params = new URL(req.url).searchParams;

  const overview = await supabase.rpc("program_overview");
  if (overview.error) throw toApiError(overview.error);
  const programs = ((overview.data ?? []) as ProgramSummary[]).map((p) => ({ ...p, photo_count: Number(p.photo_count) }));

  const program = z.uuid().safeParse(params.get("program"));
  if (!program.success) return { programs, rows: [] };

  const tree = await supabase.rpc("program_tree", { p_program: program.data });
  if (tree.error) throw toApiError(tree.error);
  return { programs, rows: (tree.data ?? []) as ProgramTreeRow[] };
});
