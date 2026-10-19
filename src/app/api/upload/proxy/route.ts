import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { MAX_ORIGINAL_BYTES, MAX_THUMB_BYTES } from "@/lib/schemas/photo";
import { getProvider } from "@/lib/storage";
import { uploadReceipt } from "@/lib/storage/secrets";
import { assertCanUpload } from "@/lib/storage-guard";
import type { ProxyUploadResult } from "@/types/storage";

/**
 * POST multipart { original, thumb, program_id }: the server writes both files to the active storage
 * (used for Google Drive, where the browser must not hold tokens). Photos are already compressed.
 */
export const POST = handle(async (req): Promise<ProxyUploadResult> => {
  const { profile, supabase } = await assertUser();
  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Send the photo as a form upload.");
  const original = form.get("original");
  const thumb = form.get("thumb");
  const programId = z.uuid().safeParse(form.get("program_id"));
  if (!(original instanceof Blob) || !(thumb instanceof Blob) || !programId.success) {
    throw new ApiError(400, "The upload is missing the photo, the thumbnail or the program.");
  }
  if (original.size > MAX_ORIGINAL_BYTES || thumb.size > MAX_THUMB_BYTES) throw new ApiError(413, "The photo is too large.");
  if (original.type !== "image/jpeg" || thumb.type !== "image/jpeg") throw new ApiError(415, "Only compressed JPEG photos are accepted.");

  const providerName = await assertCanUpload(original.size + thumb.size);
  const { data: program } = await supabase.from("programs").select("slug").eq("id", programId.data).maybeSingle();
  if (!program) throw new ApiError(400, "This program no longer exists. Choose another one.");

  const provider = getProvider(providerName);
  const fileId = randomUUID();
  const programSlug = program.slug as string;
  const { key: originalKey } = await provider.putObject({
    kind: "original",
    fileId,
    programSlug,
    body: new Uint8Array(await original.arrayBuffer()),
    contentType: "image/jpeg",
  });
  let thumbKey: string;
  try {
    ({ key: thumbKey } = await provider.putObject({
      kind: "thumb",
      fileId,
      programSlug,
      body: new Uint8Array(await thumb.arrayBuffer()),
      contentType: "image/jpeg",
    }));
  } catch (err) {
    await provider.delete([originalKey]).catch(() => undefined); // never leave half an upload behind
    throw err;
  }
  return { provider: providerName, originalKey, thumbKey, receipt: uploadReceipt(profile.id, providerName, originalKey, thumbKey) };
});
