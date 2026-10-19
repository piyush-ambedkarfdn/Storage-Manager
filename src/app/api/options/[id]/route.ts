import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { updateOptionSchema } from "@/lib/schemas/options";

type Ctx = { params: Promise<{ id: string }> };

async function optionId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This option does not exist.");
  return id;
}

/**
 * PATCH { value?, color?, hidden?, protects_photos? } (admin).
 * Renaming is safe: posts and reports store ids (from phase 6 a database trigger also renames stored labels).
 */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await optionId(ctx);
  const input = await parseBody(updateOptionSchema, req);
  const { data: before } = await supabase.from("calendar_options").select("type, value").eq("id", id).maybeSingle();
  if (!before) throw new ApiError(404, "This option does not exist.");
  if (input.protects_photos !== undefined && before.type !== "status") {
    throw new ApiError(400, "Only statuses can protect photos.");
  }
  const { error } = await supabase.from("calendar_options").update(input).eq("id", id);
  if (error) throw toApiError(error, "An option with this");
  await logActivity({ action: "option_changed", entityType: before.type, entityId: id, detail: { op: "edit", from: before.value, ...input } });
  return { ok: true };
});

/** DELETE (admin). Options in use cannot be deleted (database trigger): hide them instead. */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await optionId(ctx);
  const { data, error } = await supabase.from("calendar_options").delete().eq("id", id).select("type, value");
  if (error) throw toApiError(error, "This option");
  if (!data?.length) throw new ApiError(404, "This option does not exist.");
  await logActivity({ action: "option_changed", entityType: data[0].type, entityId: id, detail: { op: "delete", value: data[0].value } });
  return { ok: true };
});
