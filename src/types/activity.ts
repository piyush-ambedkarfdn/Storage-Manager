/**
 * Every action written to `activity_log.action`. Declared up front so later phases never edit this file.
 * Grouped by the phase that starts using them.
 */
export const ACTIVITY_ACTIONS = [
  // phase 1
  "login",
  // phase 2: staff accounts
  "user_created", "user_updated", "user_deactivated", "user_reactivated", "password_reset",
  // phase 3: places and options
  "name_suggested", "place_merged", "place_imported", "option_changed",
  // phase 4: upload and storage
  "report_created", "upload", "upload_skipped_duplicate",
  "storage_connected", "storage_disconnected", "storage_provider_changed",
  // phase 5: gallery and photo detail page
  "photos_edited", "report_edited", "download",
  // phase 6: calendar
  "content_created", "content_updated", "custom_day_created", "custom_day_updated", "custom_day_deleted",
  // phase 7: storage manager
  "photos_trashed", "photos_restored", "photos_archived", "photos_purged", "storage_moved",
  // phase 8: Gemini
  "ai_used", "report_summarized", "report_improved", "report_ai_accepted",
  // phase 9: stories
  "story_suggestions_generated", "story_created", "story_updated", "story_deleted", "story_exported",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityEntry = {
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
};
