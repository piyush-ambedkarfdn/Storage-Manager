import { ApiError, handle, parseQuery } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { getStaffStats, getTimeline, getUploadsPerDay } from "@/lib/activity-queries";
import { activityQuery, timelineQuery } from "@/lib/schemas/activity";

/**
 * GET (admin)
 *   ?view=staff                     every person with their numbers (staff_stats)
 *   ?view=perday&user=<id>&days=14  uploads per day (India dates)
 *   ?view=timeline&user&group&from&to&cursor&limit   activity_log, newest first
 */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  const { view, days } = parseQuery(activityQuery, req.url);
  if (view === "staff") return { staff: await getStaffStats(session) };
  const q = parseQuery(timelineQuery, req.url);
  if (view === "perday") {
    if (!q.user) throw new ApiError(400, "Choose a person.");
    return { days: await getUploadsPerDay(session, q.user, days) };
  }
  return getTimeline(session, q);
});
