/** Shared by the import dialog (browser) and the import API (server): the 12 calendar columns and the limits. */

export const IMPORT_FIELDS = [
  "publish_date",
  "platform",
  "content_format",
  "content_pillar",
  "title",
  "content_brief",
  "caption",
  "hashtags",
  "cta",
  "goal",
  "status",
  "production_stage",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** The header names used in the sample file (the 12 calendar columns). */
export const IMPORT_HEADERS: Record<ImportField, string> = {
  publish_date: "Publish Date",
  platform: "Platform",
  content_format: "Content Format",
  content_pillar: "Content Pillar",
  title: "Topic/Title",
  content_brief: "Content Brief",
  caption: "Caption",
  hashtags: "Hashtags",
  cta: "CTA",
  goal: "Goal",
  status: "Status",
  production_stage: "Production Stage",
};

/** Other header names we recognise by themselves (compared after lower-casing and removing punctuation). */
export const IMPORT_SYNONYMS: Record<ImportField, string[]> = {
  publish_date: ["publish date", "date", "post date", "posting date", "scheduled date", "go live date"],
  platform: ["platform", "channel", "social platform", "media"],
  content_format: ["content format", "format", "post type", "type"],
  content_pillar: ["content pillar", "pillar", "theme", "category"],
  title: ["topic title", "topic", "title", "post title", "headline", "subject"],
  content_brief: ["content brief", "brief", "description", "details", "idea"],
  caption: ["caption", "copy", "post copy", "text"],
  hashtags: ["hashtags", "hash tags", "tags"],
  cta: ["cta", "call to action"],
  goal: ["goal", "objective", "purpose"],
  status: ["status", "post status"],
  production_stage: ["production stage", "stage", "production status", "workflow stage"],
};

export const IMPORT_LIMITS = { maxBytes: 4 * 1024 * 1024, maxRows: 2000 } as const;
export const IMPORT_ACCEPT = ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const SAMPLE_FILE_URL = "/templates/content-calendar-sample.xlsx";
export const SAMPLE_FILE_NAME = "content-calendar-sample.xlsx";
