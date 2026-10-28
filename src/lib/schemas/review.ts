import { z } from "zod";
import { MAX_DOWNLOAD_PHOTOS } from "@/lib/schemas/gallery";

export const reviewDecisionSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Select at least one photo.").max(500),
  decision: z.enum(["approve", "reject"]),
  /** shown to the person who uploaded, when a photo is rejected */
  note: z.string().trim().max(500).optional(),
});

export const reviewDownloadSchema = z
  .object({ photoIds: z.array(z.uuid()).min(1).max(MAX_DOWNLOAD_PHOTOS).optional(), all: z.boolean().optional() })
  .refine((v) => v.photoIds || v.all, "Choose which photos to download.");
