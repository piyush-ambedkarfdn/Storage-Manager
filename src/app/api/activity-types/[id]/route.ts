import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { invalidateActivityTypes } from "@/lib/activity-types-server";
import { updateActivityTypeSchema } from "@/lib/schemas/activity-types";

type Ctx = { params: Promise<{ id: string }> };

async function typeId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) throw new ApiError(404, "Activity type not found.");
  return id;
}

/** PATCH { label?, label_hi?, color?, hidden? } (admin). Photos keep the type's code, so this changes them all at once. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await typeId(ctx);
  const input = await parseBody(updateActivityTypeSchema, req);
  const { data, error } = await supabase.from("activity_types").update(input).eq("id", id).select("id");
  if (error) throw toApiError(error, "An activity type with this");
  if (!data?.length) throw new ApiError(404, "Activity type not found.");
  invalidateActivityTypes();
  await logActivity({ action: "option_changed", entityType: "activity_type", entityId: id, detail: { op: "edit", ...input } });
  return { ok: true };
});

/** DELETE (admin): refused by the database while photos or reports use it (hide it instead). */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await typeId(ctx);
  const { data, error } = await supabase.from("activity_types").delete().eq("id", id).select("label");
  if (error) throw toApiError(error, "This activity type");
  if (!data?.length) throw new ApiError(404, "Activity type not found.");
  invalidateActivityTypes();
  await logActivity({ action: "option_changed", entityType: "activity_type", entityId: id, detail: { op: "delete", label: data[0].label } });
  return { ok: true };
});
