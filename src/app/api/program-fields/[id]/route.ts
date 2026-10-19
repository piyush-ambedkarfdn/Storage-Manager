import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
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

/** DELETE (admin): only when no photo uses it (otherwise hide it, so old photos keep their labels). */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await fieldId(ctx);
  const { count } = await supabase.from("photo_field_values").select("photo_id", { count: "exact", head: true }).eq("field_id", id);
  if (count) throw new ApiError(409, `${count} photos use this category. Hide it instead of deleting.`);
  const { data, error } = await supabase.from("program_fields").delete().eq("id", id).select("label");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "Category not found.");
  await logActivity({ action: "option_changed", entityType: "program_field", entityId: id, detail: { op: "delete", label: data[0].label } });
  return { ok: true };
});
