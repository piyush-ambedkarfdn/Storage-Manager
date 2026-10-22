import type { ProviderName } from "@/types/storage";

export type { ProviderName };

export type PutInput = {
  kind: "original" | "thumb";
  /** the photo's storage id (a UUID, also used as the file name) */
  fileId: string;
  programSlug: string;
  body: Uint8Array;
  contentType: string;
};

/** A non-photo file (for example an imported Excel sheet). `folder` is a slash path such as "imports/calendar". */
export type PutFileInput = {
  folder: string;
  /** unique id used in the stored name so two files with the same name never collide */
  fileId: string;
  fileName: string;
  body: Uint8Array;
  contentType: string;
};

export type DirectUpload = {
  originalKey: string;
  thumbKey: string;
  original: { url: string; headers: Record<string, string> };
  thumb: { url: string; headers: Record<string, string> };
};

/**
 * Every storage (Cloudflare R2, Google Drive) behind one interface. Only files in src/lib/storage/
 * may import the AWS or Google SDKs. Keys are R2 object keys or Google Drive file ids.
 */
export interface StorageProvider {
  name: ProviderName;
  /** env values (and for Drive, a connected account) are present */
  isConfigured(): Promise<boolean>;
  /** R2 only: presigned PUT URLs so the browser uploads directly. */
  prepareDirectUpload?(input: { fileId: string; programSlug: string; contentType: string }): Promise<DirectUpload>;
  /** Server-side write (Drive uploads, and the move tool in phase 7). */
  putObject(input: PutInput): Promise<{ key: string }>;
  /** Server-side write of a non-photo file. Returns the key (R2 object key or Drive file id). */
  putFile(input: PutFileInput): Promise<{ key: string }>;
  /** Size of a stored file, or null if it does not exist. */
  head(key: string): Promise<{ size: number } | null>;
  getBytes(key: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string; size?: number }>;
  /** URL the browser can load the thumbnail from. */
  thumbUrl(photoId: string, thumbKey: string): string;
  /** Short-lived URL for the original (R2 signed URL; Drive goes through /api/media). */
  originalUrl(photoId: string, key: string, seconds?: number): Promise<string>;
  delete(keys: string[]): Promise<void>;
  /** Real quota from the provider (Drive), or null when usage is counted from the database (R2). */
  quota(): Promise<{ usedBytes: number; limitBytes: number | null } | null>;
}
