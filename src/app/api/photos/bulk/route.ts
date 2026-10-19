import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { bulkEditSchema } from "@/lib/schemas/gallery";

/** POST { ids, set } (admin): change program, place, activity, date, consent or the children flag on many photos. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids, set } = await parseBody(bulkEditSchema, req);
  const { data, error } = await supabase.from("photos").update(set).in("id", ids).neq("status", "purged").select("id");
  if (error) throw toApiError(error);
  await logActivity({ action: "photos_edited", entityType: "photo", detail: { count: data?.length ?? 0, ids: ids.slice(0, 50), set } });
  return { updated: data?.length ?? 0 };
});
