import type { PhotoDto } from "@/types/photo";

/** What staff type in the four boxes of the upload form. */
export type ReportParts = {
  what_happened: string;
  problem: string;
  who_affected: string;
  result: string;
};

export const REPORT_PART_KEYS = ["what_happened", "problem", "who_affected", "result"] as const;

export type FieldReport = {
  id: string;
  uploaded_by: string;
  program_id: string | null;
  district_id: string | null;
  block_id: string | null;
  panchayat_id: string | null;
  village_id: string | null;
  activity_type: string | null;
  event_date: string | null;
  report: string | null;
  report_parts: Partial<ReportParts> | null;
  theme_ids: string[];
  beneficiary_count: number | null;
  created_at: string;
};

/** A report with its photos and place names, for My uploads. */
export type ReportWithPhotos = FieldReport & {
  program_name: string | null;
  place_path: string;
  photos: PhotoDto[];
};
