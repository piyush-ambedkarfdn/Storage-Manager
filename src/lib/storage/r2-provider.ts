import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { optionalEnv, requireEnv } from "@/lib/env";
import type { DirectUpload, PutInput, StorageProvider } from "@/lib/storage/types";

/**
 * Cloudflare R2 (S3 API). Free tier: 10 GB, 1M Class A and 10M Class B operations a month, free egress.
 * Keys: originals/{program}/{yyyy}/{mm}/{uuid}.jpg and thumbs/{uuid}.jpg. Metadata lives in Postgres.
 * Never list the bucket to measure usage (Class A operations); usage is summed in the database.
 */

const THUMB_CACHE = "public, max-age=31536000, immutable";
const PRESIGN_SECONDS = 15 * 60;

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: requireEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY") },
      // R2 does not accept the SDK's default checksum headers on presigned uploads.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}
const bucket = () => requireEnv("R2_BUCKET");

function keysFor(fileId: string, programSlug: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { originalKey: `originals/${programSlug}/${yyyy}/${mm}/${fileId}.jpg`, thumbKey: `thumbs/${fileId}.jpg` };
}

export const r2Provider: StorageProvider = {
  name: "r2",

  async isConfigured() {
    return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].every((k) =>
      optionalEnv(k as Parameters<typeof optionalEnv>[0]),
    );
  },

  async prepareDirectUpload({ fileId, programSlug, contentType }): Promise<DirectUpload> {
    const { originalKey, thumbKey } = keysFor(fileId, programSlug);
    const original = await getSignedUrl(
      s3(),
      new PutObjectCommand({ Bucket: bucket(), Key: originalKey, ContentType: contentType }),
      { expiresIn: PRESIGN_SECONDS },
    );
    const thumb = await getSignedUrl(
      s3(),
      new PutObjectCommand({ Bucket: bucket(), Key: thumbKey, ContentType: contentType, CacheControl: THUMB_CACHE }),
      { expiresIn: PRESIGN_SECONDS, signableHeaders: new Set(["cache-control"]) },
    );
    return {
      originalKey,
      thumbKey,
      original: { url: original, headers: { "Content-Type": contentType } },
      thumb: { url: thumb, headers: { "Content-Type": contentType, "Cache-Control": THUMB_CACHE } },
    };
  },

  async putObject({ kind, fileId, programSlug, body, contentType }: PutInput) {
    const keys = keysFor(fileId, programSlug);
    const key = kind === "original" ? keys.originalKey : keys.thumbKey;
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: kind === "thumb" ? THUMB_CACHE : undefined,
      }),
    );
    return { key };
  },

  async putFile({ folder, fileId, fileName, body, contentType }) {
    const now = new Date();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const safe = fileName.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").slice(-80) || "file";
    const key = `${folder}/${now.getUTCFullYear()}/${mm}/${fileId}-${safe}`;
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
    return { key };
  },

  async head(key) {
    try {
      const res = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      return { size: res.ContentLength ?? 0 };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw err;
    }
  },

  async getBytes(key) {
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!res.Body) throw new Error("Empty file in storage.");
    return {
      body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: res.ContentType ?? "image/jpeg",
      size: res.ContentLength,
    };
  },

  thumbUrl(photoId, thumbKey) {
    const base = optionalEnv("R2_THUMB_BASE_URL");
    return base ? `${base.replace(/\/+$/, "")}/${thumbKey}` : `/api/media/${photoId}?v=thumb`;
  },

  async originalUrl(_photoId, key, seconds = 10 * 60) {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: seconds });
  },

  async delete(keys) {
    // Deletes are free on R2. At most 1000 keys per call.
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      if (!chunk.length) continue;
      await s3().send(
        new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
      );
    }
  },

  async quota() {
    return null; // counted from the database (storage_usage())
  },
};
