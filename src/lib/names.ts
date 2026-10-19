import "server-only";
import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { SIMILARITY, type MergeType, type SimilarName } from "@/types/places";

export { SIMILARITY };

/**
 * Similar existing names (find_similar_names() in migration 0002). The spelling rules live only in
 * norm_name() in the database; never copy them into TypeScript.
 * Score 1 = same name after normalising or a saved alias; >= SIMILARITY.warn = "Did you mean?".
 */
export async function findSimilar(type: MergeType, input: string, parentId?: string | null): Promise<SimilarName[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_similar_names", {
    p_type: type,
    p_input: input,
    p_parent: parentId ?? null,
  });
  if (error) throw new ApiError(500, `Could not check similar names: ${error.message}`);
  const rows = (data ?? []) as { id: string; name: string; score: number; same_parent: boolean }[];
  return rows.map((r) => ({ id: r.id, name: r.name, score: Number(r.score), sameParent: r.same_parent }));
}

/** The match to use without asking: same spelling (or alias), preferring one under the same parent. */
export function exactMatch(matches: SimilarName[], parentId?: string | null): SimilarName | null {
  const exact = matches.filter((m) => m.score >= SIMILARITY.exact);
  if (!exact.length) return null;
  if (parentId) return exact.find((m) => m.sameParent) ?? null;
  return exact[0];
}
