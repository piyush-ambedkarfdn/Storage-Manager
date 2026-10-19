import { z } from "zod";
import { STORY_KINDS, STORY_STATUSES } from "@/types/story";

export const planPostSchema = z.object({
  title: z.string().trim().max(200),
  platform: z.string().trim().max(80),
  format: z.string().trim().max(80),
  pillar: z.string().trim().max(80),
  brief: z.string().trim().max(2000),
  date: z.iso.date().nullable(),
  awareness_day: z.string().max(200).nullable(),
});

export const planSchema = z.object({
  goal: z.string().max(1000).default(""),
  audience: z.string().max(1000).default(""),
  key_messages: z.array(z.string().max(500)).max(10).default([]),
  channels: z.array(z.string().max(80)).max(10).default([]),
  timeline: z.string().max(1000).default(""),
  ctas: z.array(z.string().max(200)).max(6).default([]),
  hashtags: z.array(z.string().max(60)).max(20).default([]),
  posts: z.array(planPostSchema).max(30).default([]),
});

export const createStorySchema = z.object({
  kind: z.enum(STORY_KINDS),
  title: z.string().trim().min(1, "Write a title.").max(200),
  source_report_ids: z.array(z.uuid()).max(30).default([]),
  theme_ids: z.array(z.uuid()).max(10).default([]),
  language: z.enum(["en", "hi"]).default("en"),
});

export const updateStorySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    summary: z.string().max(2000).nullable().optional(),
    body_md: z.string().max(60_000).optional(),
    language: z.enum(["en", "hi"]).optional(),
    status: z.enum(STORY_STATUSES).optional(),
    theme_ids: z.array(z.uuid()).max(10).optional(),
    source_report_ids: z.array(z.uuid()).max(30).optional(),
    plan: planSchema.nullable().optional(),
    published_url: z.url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
    reviewed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const storyPhotosSchema = z.object({ photo_ids: z.array(z.uuid()).max(30) });

export const suggestionActionSchema = z.object({ action: z.enum(["accept", "dismiss"]) });

export const storyListQuery = z.object({
  kind: z.enum(STORY_KINDS).optional(),
  status: z.enum(STORY_STATUSES).optional(),
});

export const aiDraftSchema = z.object({
  storyId: z.uuid(),
  language: z.enum(["en", "hi"]).default("en"),
  tone: z.enum(["warm", "formal", "simple"]).default("warm"),
});

export const aiRefineSchema = z.object({
  storyId: z.uuid(),
  instruction: z.string().trim().min(3).max(500),
});

export const aiSuggestionsSchema = z.object({ days: z.number().int().min(7).max(365).default(90) });
