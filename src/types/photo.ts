import type { ProviderName } from "@/types/storage";

export const CONSENT_VALUES = ["yes", "no", "unknown"] as const;
export type Consent = (typeof CONSENT_VALUES)[number];

export type PhotoStatus = "active" | "trashed" | "archived" | "purged";

/** A photo as the browser receives it. Never contains storage secrets; thumbUrl is built by the server. */
export type PhotoDto = {
  id: string;
  report_id: string | null;
  uploaded_by: string;
  taken_by: string | null;
  program_id: string | null;
  district_id: string | null;
  block_id: string | null;
  panchayat_id: string | null;
  village_id: string | null;
  activity_type: string | null;
  event_date: string | null;
  consent: Consent;
  has_children: boolean;
  note: string | null;
  storage_provider: ProviderName;
  width: number | null;
  height: number | null;
  size_bytes: number;
  status: PhotoStatus;
  exif_taken_at: string | null;
  ai_description: string | null;
  ai_tags: string[] | null;
  /** chosen program categories (option ids); labels come from /api/program-fields */
  category_option_ids: string[];
  created_at: string;
  thumbUrl: string;
};

/** Columns read for PhotoDto (storage keys are read too but never sent to the browser). */
export const PHOTO_COLUMNS =
  "id, report_id, uploaded_by, taken_by, program_id, district_id, block_id, panchayat_id, village_id, activity_type, event_date, consent, has_children, note, storage_provider, storage_key, thumb_key, width, height, size_bytes, status, exif_taken_at, ai_description, ai_tags, category_option_ids, created_at";
