import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { describePhotos } from "@/lib/ai/jobs";
import { assertAiReady } from "@/lib/ai/safety";

export const maxDuration = 60;

/**
 * POST { photoIds }: descriptions for consented photos without children (the first 10; the rest are
 * picked up later from /admin/ai). Staff: own photos only.
 */
export const POST = handle(async (req) => {
  assertAiReady();
  const { profile, supabase } = await assertUser();
  const { photoIds } = await parseBody(z.object({ photoIds: z.array(z.uuid()).min(1).max(50) }), req);
  if (profile.role !== "admin") {
    const { data } = await supabase.from("photos").select("id").in("id", photoIds).eq("uploaded_by", profile.id);
    if ((data ?? []).length !== photoIds.length) throw new ApiError(404, "Photo not found.");
  }
  return describePhotos(photoIds.slice(0, 10));
});
