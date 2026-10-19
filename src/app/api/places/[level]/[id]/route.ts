import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { placeLevelSchema, updatePlaceSchema } from "@/lib/schemas/places";
import type { PlaceLevel } from "@/types/places";

type Ctx = { params: Promise<{ level: string; id: string }> };

const TABLE: Record<PlaceLevel, string> = { district: "districts", block: "blocks", panchayat: "panchayats", village: "villages" };
const FK: Record<PlaceLevel, string | null> = { district: null, block: "district_id", panchayat: "block_id", village: "panchayat_id" };

async function target(ctx: Ctx): Promise<{ level: PlaceLevel; id: string }> {
  const { level, id } = await ctx.params;
  const l = placeLevelSchema.safeParse(level);
  if (!l.success || !z.uuid().safeParse(id).success) throw new ApiError(404, "This place does not exist.");
  return { level: l.data, id };
}

/**
 * PATCH { name?, approved?, parent_id? } (admin). Renaming keeps the old spelling as an alias so
 * staff who type it still find the place. Logged as option_changed with entity_type = level.
 */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const { level, id } = await target(ctx);
  const input = await parseBody(updatePlaceSchema, req);

  const { data: before, error: readError } = await supabase.from(TABLE[level]).select("name, name_norm").eq("id", id).maybeSingle();
  if (readError) throw toApiError(readError);
  if (!before) throw new ApiError(404, "This place does not exist.");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.approved !== undefined && level !== "district") patch.approved = input.approved;
  if (input.parent_id !== undefined) {
    if (!FK[level]) throw new ApiError(400, "Districts have no parent.");
    patch[FK[level]!] = input.parent_id;
  }
  const { error } = await supabase.from(TABLE[level]).update(patch).eq("id", id);
  if (error) throw toApiError(error, "A place with this");

  if (input.name !== undefined && input.name !== before.name && level !== "district") {
    await supabase
      .from("name_aliases")
      .upsert({ entity_type: level, entity_id: id, alias_norm: before.name_norm }, { ignoreDuplicates: true });
  }
  await logActivity({
    action: "option_changed",
    entityType: level,
    entityId: id,
    detail: { op: input.approved ? "approve" : "edit", from: before.name, ...input },
  });
  return { ok: true };
});

/** DELETE (admin). Refused while villages, panchayats or photos still point at it: merge instead. */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const { level, id } = await target(ctx);
  const { data, error } = await supabase.from(TABLE[level]).delete().eq("id", id).select("name");
  if (error) throw toApiError(error, "This place");
  if (!data?.length) throw new ApiError(404, "This place does not exist.");
  await logActivity({ action: "option_changed", entityType: level, entityId: id, detail: { op: "delete", name: data[0].name } });
  return { ok: true };
});
