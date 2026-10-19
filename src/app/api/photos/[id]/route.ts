import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { getPhotoDetail } from "@/lib/photos/detail";
import { updatePhotoSchema } from "@/lib/schemas/photo-detail";

type Ctx = { params: Promise<{ id: string }> };

async function photoId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Photo not found.");
  return id;
}

/** GET ?from=<gallery query> (admin): everything for the photo detail page. */
export const GET = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const id = await photoId(ctx);
  const detail = await getPhotoDetail(session, id, new URL(req.url).searchParams.get("from") ?? "");
  if (!detail) throw new ApiError(404, "Photo not found.");
  return detail;
});

/** PATCH { note?, taken_by?, consent?, has_children?, ai_description? } (admin). Place and program use /api/photos/bulk. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await photoId(ctx);
  const input = await parseBody(updatePhotoSchema, req);
  const { data: before } = await supabase.from("photos").select("note, taken_by, consent, has_children, ai_description").eq("id", id).maybeSingle();
  if (!before) throw new ApiError(404, "Photo not found.");
  const { error } = await supabase.from("photos").update(input).eq("id", id);
  if (error) throw toApiError(error);
  await logActivity({ action: "photos_edited", entityType: "photo", entityId: id, detail: { from: before, to: input } });
  return { ok: true };
});
