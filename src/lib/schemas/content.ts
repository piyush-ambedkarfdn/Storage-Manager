import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const date = z.iso.date().nullable().optional();

export const itemFieldsSchema = z.object({
  publish_date: date,
  platform: text(80),
  content_format: text(80),
  content_pillar: text(80),
  title: text(200),
  content_brief: text(4000),
  caption: text(5000),
  hashtags: text(1000),
  cta: text(300),
  goal: text(80),
  status: z.string().trim().min(1).max(80).optional(),
  production_stage: z.string().trim().min(1).max(80).optional(),
  awareness_day: text(120),
});

export const createItemSchema = itemFieldsSchema.extend({
  title: z.string().trim().min(1, "Write a title.").max(200),
  photo_ids: z.array(z.uuid()).max(50).default([]),
});

export const updateItemSchema = itemFieldsSchema.refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const setPhotosSchema = z.object({ photo_ids: z.array(z.uuid()).max(50) });

export const itemListQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  undated: z.enum(["1", "0"]).optional(),
  status: z.string().max(80).optional(),
  platform: z.string().max(80).optional(),
});
