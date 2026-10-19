import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { customDaySchema } from "@/lib/schemas/days";

type Ctx = { params: Promise<{ id: string }> };
async function dayId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This day does not exist.");
  return id;
}

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await dayId(ctx);
  const input = await parseBody(customDaySchema, req);
  const { data, error } = await supabase.from("custom_days").update(input).eq("id", id).select("id");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "This day does not exist.");
  await logActivity({ action: "custom_day_updated", entityType: "custom_day", entityId: id, detail: { name: input.name } });
  return { ok: true };
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await dayId(ctx);
  const { data, error } = await supabase.from("custom_days").delete().eq("id", id).select("name");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "This day does not exist.");
  await logActivity({ action: "custom_day_deleted", entityType: "custom_day", entityId: id, detail: { name: data[0].name } });
  return { ok: true };
});
