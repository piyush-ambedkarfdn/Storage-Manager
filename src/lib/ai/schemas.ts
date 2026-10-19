import { z } from "zod";

/** Output shapes Gemini must return (sent as JSON Schema; replies are validated with these). */

export const reportAnalysisSchema = z.object({
  summary: z.string().describe("Two or three short sentences in English"),
  problems: z.array(z.string()).max(6).describe("One short line per problem the report describes"),
  theme_codes: z.array(z.string()).max(3).describe("Codes of the matching problem themes from the given list"),
  sections: z.object({
    what_happened: z.string(),
    problem: z.string(),
    who_affected: z.string(),
    result: z.string(),
  }),
  report_en: z.string().describe("The same facts as clear, complete English sentences; missing facts as [confirm: …]"),
  report_hi: z.string().describe("The same in simple Hindi (Devanagari), or an empty string if not asked"),
  missing: z.array(z.string()).max(8).describe("Facts the report does not give, short phrases"),
});
export type ReportAnalysis = z.infer<typeof reportAnalysisSchema>;

export const themesSchema = z.object({ theme_codes: z.array(z.string()).max(3) });

export const photoDescriptionSchema = z.object({
  description: z.string().describe("One sentence about what is happening, without identifying anyone"),
  tags: z.array(z.string()).min(3).max(8),
  quality: z.number().int().min(1).max(5),
  suitable_for_social: z.boolean(),
});
export type PhotoDescription = z.infer<typeof photoDescriptionSchema>;

export const captionsSchema = z.object({ captions: z.array(z.string()).min(1).max(4) });
export const briefSchema = z.object({ brief: z.string() });
export const hashtagsSchema = z.object({ hashtags: z.array(z.string()).min(3).max(12) });
export const ctaSchema = z.object({ cta: z.array(z.string()).min(1).max(4) });

export const ideasSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string(),
        brief: z.string(),
        report_code: z.string().describe("Code of the report the idea is based on, or empty"),
        day: z.number().int().min(1).max(31).describe("Suggested day of the month"),
      }),
    )
    .max(10),
});

export const monthPlanSchema = z.object({
  items: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD within the month"),
        title: z.string(),
        platform: z.string(),
        format: z.string(),
        pillar: z.string(),
        brief: z.string(),
        reason: z.string(),
      }),
    )
    .max(20),
});

export const daysSchema = z.object({
  days: z
    .array(
      z.object({
        name: z.string(),
        date: z.string().describe("YYYY-MM-DD"),
        scope: z.enum(["national", "international", "local"]),
        why: z.string(),
        angle: z.string(),
        needsDateCheck: z.boolean(),
      }),
    )
    .max(8),
});

export const nameCheckSchema = z.object({
  same: z.boolean(),
  match_code: z.string().describe("Code of the matching candidate, or empty"),
  reason: z.string(),
});

/** What the calendar sends for caption, brief, hashtags and CTA. */
export const postContext = z.object({
  photoIds: z.array(z.uuid()).max(50).default([]),
  title: z.string().max(200).default(""),
  platform: z.string().max(80).nullable().optional(),
  format: z.string().max(80).nullable().optional(),
  goal: z.string().max(80).nullable().optional(),
  language: z.enum(["en", "hi", "both"]).default("en"),
});
