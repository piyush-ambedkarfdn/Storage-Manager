import { handle, parseBody, parseQuery } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { createItem, listItems } from "@/lib/content/queries";
import { createItemSchema, itemListQuery } from "@/lib/schemas/content";

/** GET ?from&to (or undated=1) &status&platform (admin): calendar items. */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  const q = parseQuery(itemListQuery, req.url);
  return { items: await listItems(session, { ...q, undated: q.undated === "1" }) };
});

/** POST { title, …fields, photo_ids } (admin): new calendar item. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const input = await parseBody(createItemSchema, req);
  return { item: await createItem(session, input) };
});
