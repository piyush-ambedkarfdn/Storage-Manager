import type { FieldReport, ReportParts } from "@/types/report";
import type { GalleryPhoto } from "@/types/gallery";

export type AiReviewStatus = "none" | "draft" | "accepted" | "rejected";

/** A field report with everything the AI wrote about it (phase 8 fills the ai_* fields). */
export type ReportDetail = FieldReport & {
  uploader_name: string | null;
  ai_summary: string | null;
  ai_problems: string[] | null;
  ai_theme_ids: string[];
  ai_report_en: string | null;
  ai_report_hi: string | null;
  ai_sections: Partial<ReportParts> | null;
  ai_missing: string[] | null;
  ai_model: string | null;
  ai_processed_at: string | null;
  ai_review_status: AiReviewStatus;
  ai_reviewed_by_name: string | null;
  ai_reviewed_at: string | null;
};

export type PhotoUsage = {
  calendar: { id: string; title: string | null; publish_date: string | null; platform: string | null; status: string }[] | null;
  stories: { id: string; title: string; kind: string; status: string }[] | null;
};

/** Everything the photo detail page shows. */
export type PhotoDetail = {
  photo: GalleryPhoto & {
    block_name: string | null;
    uploader_name: string | null;
    ai_quality: number | null;
    ai_suitable_for_social: boolean | null;
    thumb_size_bytes: number | null;
  };
  /** large view: the original (or the thumbnail when archived) */
  displayUrl: string;
  originalAvailable: boolean;
  report: ReportDetail | null;
  siblings: { id: string; thumbUrl: string }[];
  prevId: string | null;
  nextId: string | null;
  usage: PhotoUsage;
};
