import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { downloadLogSchema } from "@/lib/schemas/gallery";

/** POST { photoIds } (admin): after a finished download, marks the photos and logs it. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { photoIds } = await parseBody(downloadLogSchema, req);
  const { error } = await supabase.from("photos").update({ last_downloaded_at: new Date().toISOString() }).in("id", photoIds);
  if (error) throw toApiError(error);
  await logActivity({ action: "download", entityType: "photo", detail: { count: photoIds.length } });
  return { ok: true };
});
