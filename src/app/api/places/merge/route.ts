import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import { mergeSchema } from "@/lib/schemas/places";

/**
 * POST { type, from, into } (admin). merge_place() moves child places and photos to `into`,
 * keeps the old spelling as an alias, deletes `from`, and logs place_merged.
 */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { type, from, into } = await parseBody(mergeSchema, req);
  if (from === into) throw new ApiError(400, "Choose a different place to merge into.");
  const { error } = await supabase.rpc("merge_place", { p_type: type, p_from: from, p_into: into });
  if (error) throw toApiError(error);
  return { ok: true };
});
