import type { ContentPhoto, ContentReport } from "@/types/content";

export const STORY_KINDS = ["impact_story", "case_study", "campaign"] as const;
export type StoryKind = (typeof STORY_KINDS)[number];
export const STORY_STATUSES = ["idea", "draft", "ready", "published"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

export type PlanPost = {
  title: string;
  platform: string;
  format: string;
  pillar: string;
  brief: string;
  date: string | null; // YYYY-MM-DD
  awareness_day: string | null;
};

/** A campaign's plan (stories.plan). */
export type StoryPlan = {
  goal: string;
  audience: string;
  key_messages: string[];
  channels: string[];
  timeline: string;
  ctas: string[];
  hashtags: string[];
  posts: PlanPost[];
};

export type Story = {
  id: string;
  kind: StoryKind;
  title: string;
  summary: string | null;
  body_md: string;
  language: "en" | "hi";
  status: StoryStatus;
  theme_ids: string[];
  source_report_ids: string[];
  plan: StoryPlan | null;
  ai_generated: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  first_thumb?: string | null;
};

export type StoryBlocker = { photo_id: string; reason: "no_consent" | "children" };

export type StoryDetail = {
  story: Story;
  photos: ContentPhoto[];
  reports: ContentReport[];
  blockers: StoryBlocker[];
  reviewer_name: string | null;
  calendar_count: number;
};

export type StorySuggestion = {
  id: string;
  kind: StoryKind;
  title: string;
  problem: string | null;
  places: string | null;
  why_now: string | null;
  rationale: string | null;
  report_ids: string[];
  theme_ids: string[];
  suggested_window: string | null;
  status: "new" | "accepted" | "dismissed";
  story_id: string | null;
  created_at: string;
};

export const STORY_COLUMNS =
  "id, kind, title, summary, body_md, language, status, theme_ids, source_report_ids, plan, ai_generated, reviewed_by, reviewed_at, published_url, created_at, updated_at";
