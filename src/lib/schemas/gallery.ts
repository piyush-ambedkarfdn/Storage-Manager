import { z } from "zod";
import { CONSENT_VALUES } from "@/types/photo";
import { DOWNLOAD_LEVELS } from "@/types/gallery";

const ids = z.array(z.uuid()).min(1).max(2000);

/** Program categories for many photos: applied only to photos of that program (others are skipped). */
export const bulkCategoriesSchema = z.object({
  program_id: z.uuid(),
  values: z.record(z.uuid(), z.array(z.uuid()).max(20)),
});

export const bulkEditSchema = z.object({
  ids,
  categories: bulkCategoriesSchema.optional(),
  set: z
    .object({
      program_id: z.uuid().optional(),
      district_id: z.uuid().optional(),
      block_id: z.uuid().optional(),
      panchayat_id: z.uuid().optional(),
      village_id: z.uuid().optional(),
      activity_type: z.string().min(1).max(40).optional(),
      event_date: z.iso.date().optional(),
      consent: z.enum(CONSENT_VALUES).optional(),
      has_children: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "Choose at least one thing to change.")
    .refine((v) => !v.village_id || (v.panchayat_id && v.block_id && v.district_id), "A new village needs its district, block and panchayat.")
    .optional(),
}).refine((v) => v.set || v.categories, "Choose at least one thing to change.");

export const downloadManifestSchema = z.object({
  /** either explicit photo ids or the gallery's current query string */
  photoIds: z.array(z.uuid()).max(2000).optional(),
  query: z.string().max(8000).optional(),
  levels: z.array(z.enum(DOWNLOAD_LEVELS)).max(6),
  template: z.string().trim().min(1).max(200).default("{date}_{village}_{activity}_{seq}"),
});

export const downloadLogSchema = z.object({ photoIds: z.array(z.uuid()).min(1).max(2000) });

export const MAX_DOWNLOAD_PHOTOS = 2000;
