import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fromRow, getActivityTypes, setActivityTypes, type ActivityType } from "@/config/activity-types";

/**
 * Loads activity types from the database into the shared list (kept for 5 seconds per server instance, so
 * a change shows on the next page load; the editing screen also refreshes itself right away).
 * Read with the service role: it is non-secret configuration and must also load for signed-out pages.
 * Admin changes call invalidateActivityTypes() so this instance sees them at once.
 */
let loadedAt = 0;

export async function loadActivityTypes(): Promise<readonly ActivityType[]> {
  if (Date.now() - loadedAt < 5_000) return getActivityTypes();
  try {
    const { data, error } = await createAdminClient()
      .from("activity_types")
      .select("id, label, label_hi, color, hidden, program_id")
      .order("sort_order")
      .order("label");
    if (!error && data?.length) {
      setActivityTypes(data.map(fromRow));
      loadedAt = Date.now();
    }
  } catch (err) {
    console.error("[activity types] using the built-in list:", err);
  }
  return getActivityTypes();
}

export function invalidateActivityTypes() {
  loadedAt = 0;
}
