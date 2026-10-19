import { z } from "zod";
import { PROVIDER_NAMES } from "@/types/storage";
import { CLEANUP_ONLY } from "@/types/cleanup";

export const cleanupFiltersSchema = z.object({
  olderThanDays: z.number().int().min(0).max(36500),
  programId: z.uuid().nullable().optional(),
  uploaderId: z.uuid().nullable().optional(),
  only: z.enum(CLEANUP_ONLY).nullable().optional(),
});

export const cleanupApplySchema = z.object({
  filters: cleanupFiltersSchema,
  action: z.enum(["trash", "archive"]),
  /** archive works in batches (files are deleted from storage); trash does everything at once */
  batch: z.number().int().min(1).max(100).default(25),
});

export const trashActionSchema = z.object({
  action: z.enum(["trash", "restore", "delete_now", "archive"]),
  ids: z.array(z.uuid()).min(1).max(500),
});

export const storageSettingsSchema = z
  .object({
    limit_gb: z.number().min(0.1).max(10_000),
    warn_pct: z.number().int().min(10).max(99),
    amber_pct: z.number().int().min(10).max(99),
    block_pct: z.number().int().min(10).max(100),
    trash_days: z.number().int().min(1).max(365),
  })
  .refine((v) => v.warn_pct < v.amber_pct && v.amber_pct < v.block_pct, { message: "Warning < banner < block, please.", path: ["amber_pct"] });

export const moveSchema = z
  .object({
    from: z.enum(PROVIDER_NAMES),
    to: z.enum(PROVIDER_NAMES),
    limit: z.number().int().min(1).max(25).default(10),
    exclude: z.array(z.uuid()).max(2000).default([]),
  })
  .refine((v) => v.from !== v.to, { message: "Choose two different storages.", path: ["to"] });
