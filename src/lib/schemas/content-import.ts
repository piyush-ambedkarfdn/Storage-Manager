import { z } from "zod";
import { IMPORT_LIMITS } from "@/lib/content/import-template";

const text = (max: number) => z.string().trim().max(max).nullable();

export const importRowSchema = z.object({
  n: z.number().int().min(1),
  publish_date: z.iso.date().nullable(),
  platform: text(80),
  content_format: text(80),
  content_pillar: text(80),
  title: z.string().trim().min(1).max(200),
  content_brief: text(4000),
  caption: text(5000),
  hashtags: text(1000),
  cta: text(300),
  goal: text(80),
  status: text(80),
  production_stage: text(80),
});

/** The JSON part of the multipart request; the Excel/CSV file is the other part. */
export const importPayloadSchema = z.object({
  rows: z.array(importRowSchema).min(1, "There are no rows to import.").max(IMPORT_LIMITS.maxRows),
  addOptions: z.boolean().default(true),
  skipDuplicates: z.boolean().default(true),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;
