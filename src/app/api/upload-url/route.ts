import { randomUUID } from "node:crypto";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { uploadUrlSchema } from "@/lib/schemas/photo";
import { getProvider } from "@/lib/storage";
import { uploadReceipt } from "@/lib/storage/secrets";
import { assertCanUpload } from "@/lib/storage-guard";
import type { UploadPlan } from "@/types/storage";

/**
 * POST { program_id, size_bytes, thumb_size_bytes }: how to upload one photo to the ACTIVE storage.
 * Refused (507) when storage is nearly full. R2: two presigned PUT URLs (the browser uploads directly).
 * Google Drive: "proxy" (the browser posts the files to /api/upload/proxy).
 */
export const POST = handle(async (req): Promise<UploadPlan> => {
  const { profile, supabase } = await assertUser();
  const input = await parseBody(uploadUrlSchema, req);
  const provider = await assertCanUpload(input.size_bytes + input.thumb_size_bytes);
  if (provider === "gdrive") return { mode: "proxy", provider: "gdrive" };

  const { data: program } = await supabase.from("programs").select("slug").eq("id", input.program_id).maybeSingle();
  if (!program) throw new ApiError(400, "This program no longer exists. Choose another one.");

  const r2 = getProvider("r2");
  const plan = await r2.prepareDirectUpload!({ fileId: randomUUID(), programSlug: program.slug as string, contentType: "image/jpeg" });
  return {
    mode: "direct",
    provider: "r2",
    originalKey: plan.originalKey,
    thumbKey: plan.thumbKey,
    puts: { original: plan.original, thumb: plan.thumb },
    receipt: uploadReceipt(profile.id, "r2", plan.originalKey, plan.thumbKey),
  };
});
