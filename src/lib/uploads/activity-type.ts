import { activityLabel } from "@/config/activity-types";

/**
 * The activity type name of a photo (what staff picked in step 1: the program's own types, e.g. "Bridge Making" for
 * GOONJ or "Governance" for Meeting/Workshop). Server code calls loadActivityTypes() first so the names are current.
 */
export function activityNameOf(id: string | null | undefined): string | null {
  return id ? activityLabel(id, "en") : null;
}

export const NO_ACTIVITY_FOLDER = "No activity type";
export const NO_VILLAGE_FOLDER = "Village not set";
