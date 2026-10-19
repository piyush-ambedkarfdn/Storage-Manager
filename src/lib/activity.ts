import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityEntry } from "@/types/activity";

/**
 * Writes one row to activity_log as the signed-in user (RLS: actor must be the caller).
 * Never throws: a failed log must not break the action that was logged.
 */
export async function logActivity({ action, entityType, entityId, detail }: ActivityEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const actor = data?.claims?.sub;
    if (!actor) return;
    const { error } = await supabase.from("activity_log").insert({
      actor,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      detail: detail ?? null,
    });
    if (error) console.error("[activity]", action, error.message);
  } catch (err) {
    console.error("[activity]", action, err);
  }
}
