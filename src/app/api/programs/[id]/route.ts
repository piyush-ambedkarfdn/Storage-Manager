import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { updateProgramSchema } from "@/lib/schemas/options";

type Ctx = { params: Promise<{ id: string }> };

async function programId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This program does not exist.");
  return id;
}

/** PATCH { name?, hidden? } (admin). The slug never changes. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await programId(ctx);
  const input = await parseBody(updateProgramSchema, req);
  const { data: before } = await supabase.from("programs").select("name").eq("id", id).maybeSingle();
  if (!before) throw new ApiError(404, "This program does not exist.");
  const { error } = await supabase.from("programs").update(input).eq("id", id);
  if (error) throw toApiError(error, "A program with this");
  await logActivity({ action: "option_changed", entityType: "program", entityId: id, detail: { op: "edit", from: before.name, ...input } });
  return { ok: true };
});

/** DELETE (admin). Refused while photos use it: merge or hide instead. */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await programId(ctx);
  const { data, error } = await supabase.from("programs").delete().eq("id", id).select("name");
  if (error) throw toApiError(error, "This program");
  if (!data?.length) throw new ApiError(404, "This program does not exist.");
  await logActivity({ action: "option_changed", entityType: "program", entityId: id, detail: { op: "delete", name: data[0].name } });
  return { ok: true };
});
