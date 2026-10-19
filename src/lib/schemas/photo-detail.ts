import { z } from "zod";
import { CONSENT_VALUES } from "@/types/photo";

const part = z.string().trim().max(2000);

/** Admin fixes to the staff report. The previous text is kept in the activity log. */
export const updateReportSchema = z
  .object({
    report_parts: z
      .object({ what_happened: part.min(1, "Write what happened."), problem: part, who_affected: part, result: part })
      .optional(),
    theme_ids: z.array(z.uuid()).min(1, "Keep at least one theme.").max(3, "At most three themes.").optional(),
    beneficiary_count: z.number().int().min(0).max(1_000_000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

/** Accept (optionally with the admin's edited text) or reject the AI version of a report. */
export const reviewSchema = z.object({
  action: z.enum(["accept", "reject"]),
  text: z.string().trim().min(1).max(8000).optional(),
});

/** Single-photo edits from the detail page. */
export const updatePhotoSchema = z
  .object({
    note: z.string().trim().max(300).nullable().optional(),
    taken_by: z.string().trim().max(120).nullable().optional(),
    consent: z.enum(CONSENT_VALUES).optional(),
    has_children: z.boolean().optional(),
    ai_description: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");
