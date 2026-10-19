import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getItem, ITEM_COLUMNS } from "@/lib/content/queries";
import { toApiError } from "@/lib/options";
import { updateItemSchema } from "@/lib/schemas/content";

type Ctx = { params: Promise<{ id: string }> };

async function itemId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This calendar item does not exist.");
  return id;
}

/** GET (admin): the item with its photos and the field reports behind them. */
export const GET = handle<Ctx>(async (_req, ctx) => {
  const session = await assertAdmin();
  return getItem(session, await itemId(ctx));
});

/** PATCH { …fields } (admin): inline edits, drag to another date, status changes. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await itemId(ctx);
  const input = await parseBody(updateItemSchema, req);
  if ("title" in input && !input.title) throw new ApiError(400, "Write a title.");
  const { data, error } = await supabase.from("content_items").update(input).eq("id", id).select(ITEM_COLUMNS).maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "This calendar item does not exist.");
  await logActivity({ action: "content_updated", entityType: "content_item", entityId: id, detail: { fields: Object.keys(input) } });
  return { item: data };
});

/** DELETE (admin). Its photos stay in the library. */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const id = await itemId(ctx);
  const { data, error } = await supabase.from("content_items").delete().eq("id", id).select("title");
  if (error) throw toApiError(error);
  if (!data?.length) throw new ApiError(404, "This calendar item does not exist.");
  await logActivity({ action: "content_updated", entityType: "content_item", entityId: id, detail: { deleted: true, title: data[0].title } });
  return { ok: true };
});
