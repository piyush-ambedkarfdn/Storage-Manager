import type { Consent } from "@/types/photo";
import type { ReportParts } from "@/types/report";

/** The 12 calendar columns plus bookkeeping. Option columns hold the option's label (renames cascade in the database). */
export type ContentItem = {
  id: string;
  publish_date: string | null;
  platform: string | null;
  content_format: string | null;
  content_pillar: string | null;
  title: string | null;
  content_brief: string | null;
  caption: string | null;
  hashtags: string | null;
  cta: string | null;
  goal: string | null;
  status: string;
  production_stage: string;
  awareness_day: string | null;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  first_thumb?: string | null;
};

export const ITEM_TEXT_FIELDS = ["title", "content_brief", "caption", "hashtags", "cta"] as const;
export const ITEM_OPTION_FIELDS = {
  platform: "platform",
  content_format: "format",
  content_pillar: "pillar",
  goal: "goal",
  status: "status",
  production_stage: "stage",
} as const;

/** A photo attached to a post, with what the consent and children warnings need. */
export type ContentPhoto = {
  id: string;
  thumbUrl: string;
  activity_type: string | null;
  consent: Consent;
  has_children: boolean;
  village_name: string | null;
  event_date: string | null;
  report_id: string | null;
};

/** The staff report behind attached photos, for writing the post (accepted AI text preferred). */
export type ContentReport = {
  id: string;
  activity_type: string | null;
  event_date: string | null;
  place_path: string;
  report_parts: Partial<ReportParts> | null;
  report: string | null;
  ai_report_en: string | null;
  ai_review_status: string;
  theme_ids: string[];
};

export type PhotosInfo = { photos: ContentPhoto[]; reports: ContentReport[] };

export type ContentSummary = {
  byStage: { stage: string; total: number }[];
  byPlatform: { platform: string; total: number }[];
  next7: ContentItem[];
  overdue: ContentItem[];
  photosByActivity: Record<string, number>;
  reportsByTheme: Record<string, number>;
  library: { uploadsThisWeek: number; photosTotal: number; photosUnused: number; namesPending: number };
};
