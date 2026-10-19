import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { photosInfo, setItemPhotos } from "@/lib/content/queries";
import { setPhotosSchema } from "@/lib/schemas/content";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET ?ids=a,b,c (admin): photo info and field reports for photos not saved to an item yet
 * (use id "new"), or for an item's current photos when ids is left out.
 */
export const GET = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const { id } = await ctx.params;
  const raw = new URL(req.url).searchParams.get("ids");
  if (raw !== null) {
    const ids = raw.split(",").filter(Boolean);
    if (ids.length > 50 || !ids.every((x) => z.uuid().safeParse(x).success)) throw new ApiError(400, "Bad photo list.");
    return photosInfo(session, ids);
  }
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This calendar item does not exist.");
  const { data } = await session.supabase.from("content_item_photos").select("photo_id").eq("content_item_id", id).order("sort_order");
  return photosInfo(session, (data ?? []).map((d) => d.photo_id as string));
});

/** PUT { photo_ids } (admin): the item's photos, in order. */
export const PUT = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This calendar item does not exist.");
  const { photo_ids } = await parseBody(setPhotosSchema, req);
  await setItemPhotos(session, id, photo_ids);
  await logActivity({ action: "content_updated", entityType: "content_item", entityId: id, detail: { photos: photo_ids.length } });
  return { ok: true };
});
