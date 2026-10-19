import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { checkFieldValues, getProgramFields, setPhotoCategories } from "@/lib/program-fields";
import { setCategoriesSchema } from "@/lib/schemas/program-fields";

type Ctx = { params: Promise<{ id: string }> };

/** PUT { values } (admin): replace one photo's categories (they must belong to the photo's program). */
export const PUT = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Photo not found.");
  const { values } = await parseBody(setCategoriesSchema, req);
  const { data: photo } = await supabase.from("photos").select("program_id").eq("id", id).maybeSingle();
  if (!photo) throw new ApiError(404, "Photo not found.");
  if (!photo.program_id) throw new ApiError(409, "Give the photo a program first.");
  const fields = await getProgramFields(supabase, photo.program_id as string, true);
  const rows = checkFieldValues(fields, values, { requireRequired: false });
  await setPhotoCategories(supabase, id, rows);
  await logActivity({ action: "photos_edited", entityType: "photo", entityId: id, detail: { categories: rows.length } });
  return { ok: true };
});
