import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";

const bodySchema = z.object({ ids: z.array(z.uuid()).min(1, "Select at least one post.").max(500) });

/** POST { ids } (admin): deletes many calendar items at once. Their photos stay in the library. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids } = await parseBody(bodySchema, req);
  const unique = [...new Set(ids)];
  const { data, error } = await supabase.from("content_items").delete().in("id", unique).select("id, title");
  if (error) throw toApiError(error);
  const deleted = data ?? [];
  if (deleted.length) {
    await logActivity({
      action: "content_updated",
      entityType: "content_item",
      detail: { deleted: true, bulk: deleted.length, titles: deleted.slice(0, 10).map((d) => d.title) },
    });
  }
  return { deleted: deleted.length };
});
