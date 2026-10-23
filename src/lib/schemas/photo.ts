import { z } from "zod";
import { PROVIDER_NAMES } from "@/types/storage";

/** Compressed photos are about 300-500 KB; anything near the platform's request limit is refused. */
export const MAX_ORIGINAL_BYTES = 3_500_000;
export const MAX_THUMB_BYTES = 400_000;

const sha256 = z.string().regex(/^[a-f0-9]{64}$/, "Invalid file fingerprint.");

export const checkHashSchema = z.object({ hash: sha256 });

export const uploadUrlSchema = z.object({
  program_id: z.uuid(),
  size_bytes: z.number().int().positive().max(MAX_ORIGINAL_BYTES, "The photo is too large after compression."),
  thumb_size_bytes: z.number().int().positive().max(MAX_THUMB_BYTES),
});

export const createPhotoSchema = z.object({
  report_id: z.uuid(),
  provider: z.enum(PROVIDER_NAMES),
  original_key: z.string().min(1).max(300),
  thumb_key: z.string().min(1).max(300),
  receipt: z.string().min(10).max(200),
  size_bytes: z.number().int().positive().max(MAX_ORIGINAL_BYTES),
  thumb_size_bytes: z.number().int().positive().max(MAX_THUMB_BYTES),
  width: z.number().int().positive().max(20000).nullable(),
  height: z.number().int().positive().max(20000).nullable(),
  content_hash: sha256,
  exif_taken_at: z.iso.datetime({ offset: true }).nullable(),
  // per-photo overrides (otherwise the report's values are used)
  village_id: z.uuid().nullable().optional(),
  panchayat_id: z.uuid().nullable().optional(),
  block_id: z.uuid().nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
  has_children: z.boolean().default(false),
  consent: z.enum(["yes", "no", "unknown"]),
  taken_by: z.string().trim().max(120).nullable().optional(),
  /** the uploader's own rating, 1 to 5 stars (optional) */
  rating: z.number().int().min(1).max(5).nullable().optional(),
  /** program categories: fieldId → optionIds */
  field_values: z.record(z.uuid(), z.array(z.uuid()).max(20)).default({}),
});
export type CreatePhotoInput = z.infer<typeof createPhotoSchema>;

export const photoListQuery = z.object({
  report_id: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(48),
});

export const mediaQuery = z.object({ v: z.enum(["thumb", "original"]).default("thumb") });
