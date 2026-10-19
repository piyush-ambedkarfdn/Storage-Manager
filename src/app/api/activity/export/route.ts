import { handle, parseQuery } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { getTimeline } from "@/lib/activity-queries";
import { csvCell } from "@/lib/download/paths";
import { timelineQuery } from "@/lib/schemas/activity";

/** GET same filters as the timeline (admin): up to 5000 rows as a CSV file (opens in Excel, keeps Hindi). */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  const q = parseQuery(timelineQuery, req.url);
  const rows: string[] = ["time_ist,person,action,item_type,item_id,detail"];
  let cursor: string | undefined;
  for (let i = 0; i < 25; i++) {
    const { entries, nextCursor } = await getTimeline(session, { ...q, limit: 200, cursor });
    for (const e of entries) {
      const ist = new Date(new Date(e.created_at).getTime() + 330 * 60_000).toISOString().replace("T", " ").slice(0, 19);
      rows.push([ist, e.actor_name ?? (e.actor ? e.actor : "system"), e.action, e.entity_type, e.entity_id, e.detail ? JSON.stringify(e.detail) : ""].map(csvCell).join(","));
    }
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  const name = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("\uFEFF" + rows.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
});
