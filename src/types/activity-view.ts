import type { ActivityAction } from "@/types/activity";

export type StaffStat = {
  user_id: string;
  full_name: string | null;
  login_id: string | null;
  role: "admin" | "uploader";
  active: boolean;
  last_seen_at: string | null;
  districts: string | null;
  photos_total: number;
  photos_week: number;
  storage_bytes: number;
  names_suggested: number;
  reports_total: number;
};

export type DayCount = { day: string; photos: number };

export type TimelineEntry = {
  id: number | string;
  action: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor: string | null;
  actor_name: string | null;
};

/** Groups for the timeline filter (each maps to a set of actions). */
export const ACTIVITY_GROUPS = {
  uploads: ["upload", "upload_skipped_duplicate", "report_created"],
  logins: ["login"],
  places: ["name_suggested", "place_merged", "place_imported", "option_changed"],
  edits: ["photos_edited", "report_edited", "report_ai_accepted", "content_created", "content_updated", "custom_day_created", "custom_day_updated", "custom_day_deleted"],
  storage: ["photos_trashed", "photos_restored", "photos_archived", "photos_purged", "storage_moved", "storage_connected", "storage_disconnected", "storage_provider_changed", "download"],
  staff: ["user_created", "user_updated", "user_deactivated", "user_reactivated", "password_reset"],
  ai: ["ai_used", "report_summarized", "report_improved", "story_suggestions_generated"],
  stories: ["story_created", "story_updated", "story_deleted", "story_exported"],
} as const satisfies Record<string, readonly ActivityAction[]>;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;
