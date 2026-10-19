import { handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { checkHashSchema } from "@/lib/schemas/photo";

/** POST { hash }: true if this exact photo is already in the library (anyone's). Checked before uploading. */
export const POST = handle(async (req) => {
  const { supabase } = await assertUser();
  const { hash } = await parseBody(checkHashSchema, req);
  const { data, error } = await supabase.rpc("photo_hash_exists", { p_hash: hash });
  if (error) throw toApiError(error);
  const duplicate = data === true;
  if (duplicate) await logActivity({ action: "upload_skipped_duplicate", detail: { hash } });
  return { duplicate };
});
