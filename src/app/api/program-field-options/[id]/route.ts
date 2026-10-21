import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { assertNoLivePhotos } from "@/lib/program-fields";
import { updateOptionSchema } from "@/lib/schemas/program-fields";

type Ctx = { params: Promise<{ id: string }> };
async function optionId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Choice not found.");
  return id;
}

/** PATCH (admin): rename (photos keep it: they store the id), Hindi name, colour, hide. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await optionId(ctx);
  const input = await parseBody(updateOptionSchema, req);
  const { error } = await supabase.from("program_field_options").update(input).eq("id", id);
  if (error) throw toApiError(error, "A choice with this");
  await logActivity({ action: "option_changed", entityType: "program_field_option", entityId: id, detail: { op: "edit", ...input } });
  return { ok: true };
});

/** DELETE (admin): refused while photos still use it; hide it instead. Photos deleted for good do not count. */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await optionId(ctx);
  await assertNoLivePhotos(supabase, "option_id", id, "choice");
  const { data, error } = await supabase.from("program_field_options").delete().eq("id", id).select("value");
  if (error) throw toApiError(error, "This choice");
  if (!data?.length) throw new ApiError(404, "Choice not found.");
  await logActivity({ action: "option_changed", entityType: "program_field_option", entityId: id, detail: { op: "delete", value: data[0].value } });
  return { ok: true };
});