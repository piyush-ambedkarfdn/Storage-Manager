import { z } from "zod";

const part = z.string().trim().max(2000, "Keep each answer under 2000 characters.");

export const reportPartsSchema = z.object({
  what_happened: part.min(1, "Write what happened."),
  problem: part.default(""),
  who_affected: part.default(""),
  result: part.default(""),
});

/** Batch details shared by every photo of one upload. */
export const batchDetailsSchema = z.object({
  program_id: z.uuid("Choose a program."),
  district_id: z.uuid("Choose a district."),
  block_id: z.uuid("Choose a block."),
  panchayat_id: z.uuid("Choose a panchayat."),
  village_id: z.uuid("Choose a village."),
  activity_type: z.string().min(1, "Choose the activity type.").max(40),
  event_date: z.iso.date("Choose the date of the activity."),
  taken_by: z.string().trim().max(120).optional(),
  report_parts: reportPartsSchema,
  theme_ids: z.array(z.uuid()).min(1, "Pick at least one problem theme.").max(3, "Pick at most three themes."),
  consent: z.enum(["yes", "no", "unknown"]),
  beneficiary_count: z.number().int().min(0).max(1_000_000).nullable().optional(),
  /** program categories for every photo of the batch: fieldId → optionIds */
  field_values: z.record(z.uuid(), z.array(z.uuid()).max(20)).default({}),
});
export type BatchDetails = z.infer<typeof batchDetailsSchema>;

export const createReportSchema = batchDetailsSchema
  .omit({ taken_by: true, consent: true, field_values: true })
  .extend({ client_ref: z.uuid() });

export const reportListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.iso.datetime({ offset: true }).optional(),
});

export function joinReport(parts: z.infer<typeof reportPartsSchema>): string {
  const labels: [keyof typeof parts, string][] = [
    ["what_happened", "What happened"],
    ["problem", "Problem"],
    ["who_affected", "Who was affected"],
    ["result", "Result"],
  ];
  return labels
    .filter(([k]) => parts[k]?.trim())
    .map(([k, label]) => `${label}: ${parts[k].trim()}`)
    .join("\n");
}
