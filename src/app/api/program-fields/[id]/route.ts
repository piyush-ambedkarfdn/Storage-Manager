import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { assertNoLivePhotos } from "@/lib/program-fields";
import { updateFieldSchema } from "@/lib/schemas/program-fields";

type Ctx = { params: Promise<{ id: string }> };
async function fieldId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Category not found.");
  return id;
}

/** PATCH (admin): rename, Hindi name, one/several choices, required, hide. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await fieldId(ctx);
  const input = await parseBody(updateFieldSchema, req);
  const { error } = await supabase.from("program_fields").update(input).eq("id", id);
  if (error) throw toApiError(error, "A category with this");
  await logActivity({ action: "option_changed", entityType: "program_field", entityId: id, detail: { op: "edit", ...input } });
  return { ok: true };
});

/**
 * DELETE (admin): refused while photos still use it (otherwise hide it, so those photos keep their labels).
 * Photos deleted for good (purged) no longer count; photos in the trash do, because they can be restored.
 */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await fieldId(ctx);
  await assertNoLivePhotos(supabase, "field_id", id, "category");
  const { data, error } = await supabase.from("program_fields").delete().eq("id", id).select("label");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "Category not found.");
  await logActivity({ action: "option_changed", entityType: "program_field", entityId: id, detail: { op: "delete", label: data[0].label } });
  return { ok: true };
});