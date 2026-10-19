import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { getSummary } from "@/lib/content/queries";

/** GET ?today=YYYY-MM-DD (admin): dashboard numbers. The browser sends its own date (India time). */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  const raw = new URL(req.url).searchParams.get("today");
  const today = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
  return getSummary(session, today);
});
