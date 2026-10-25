import { z } from "zod";
import { MAX_DOWNLOAD_PHOTOS } from "@/lib/schemas/gallery";

/** Either some of my photos (ids) or all of them. */
export const myDownloadSchema = z
  .object({
    photoIds: z.array(z.uuid()).min(1).max(MAX_DOWNLOAD_PHOTOS).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.photoIds || v.all, "Choose which photos to download.");
