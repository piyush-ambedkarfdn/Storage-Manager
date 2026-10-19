import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { createOptionSchema, reorderSchema } from "@/lib/schemas/program-fields";

type Ctx = { params: Promise<{ id: string }> };
async function fieldId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Category not found.");
  return id;
}

/** POST { value, value_hi?, color? } (admin): add a choice at the end. */
export const POST = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await fieldId(ctx);
  const input = await parseBody(createOptionSchema, req);
  const { data: last } = await supabase.from("program_field_options").select("sort_order").eq("field_id", id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("program_field_options")
    .insert({ field_id: id, ...input, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw toApiError(error, "A choice with this");
  await logActivity({ action: "option_changed", entityType: "program_field_option", entityId: data.id, detail: { op: "create", value: input.value } });
  return { id: data.id };
});

/** PUT { ids } (admin): new order of the choices. */
export const PUT = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await fieldId(ctx);
  const { ids } = await parseBody(reorderSchema, req);
  for (const [i, optionId] of ids.entries()) {
    const { error } = await supabase.from("program_field_options").update({ sort_order: i + 1 }).eq("id", optionId).eq("field_id", id);
    if (error) throw toApiError(error);
  }
  return { ok: true };
});
