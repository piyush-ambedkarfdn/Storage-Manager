import "server-only";
import { Readable } from "node:stream";
import { drive, type drive_v3 } from "@googleapis/drive";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizedClient, getConnection, googleAppConfigured } from "@/lib/storage/google-auth";
import type { PutInput, StorageProvider } from "@/lib/storage/types";

/**
 * Google Drive storage. Uploads go through our server (photos are small), so tokens never reach the browser.
 * Folders: <root>/originals/{program}/{yyyy-mm} and <root>/thumbs, created on demand, ids cached in storage_folders.
 * Keys are Drive file ids. Reading goes through /api/media/[id], which checks access first.
 */

async function api(): Promise<{ d: drive_v3.Drive; rootFolderId: string }> {
  const { client, rootFolderId } = await authorizedClient();
  // google-auth-library and @googleapis/drive ship separate copies of the auth types
  return { d: drive({ version: "v3", auth: client as unknown as drive_v3.Options["auth"] }), rootFolderId };
}

/** Retries Drive's rate-limit and server errors with backoff. */
async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
      if (attempt >= tries - 1 || !(code === 429 || code === 403 || (typeof code === "number" && code >= 500))) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 250));
    }
  }
}

async function folderId(d: drive_v3.Drive, rootFolderId: string, path: string): Promise<string> {
  const admin = createAdminClient();
  const { data: cachedRow } = await admin.from("storage_folders").select("folder_id").eq("provider", "gdrive").eq("path", path).maybeSingle();
  if (cachedRow?.folder_id) return cachedRow.folder_id as string;

  let parent = rootFolderId;
  let sofar = "";
  for (const part of path.split("/")) {
    sofar = sofar ? `${sofar}/${part}` : part;
    const { data: hit } = await admin.from("storage_folders").select("folder_id").eq("provider", "gdrive").eq("path", sofar).maybeSingle();
    if (hit?.folder_id) {
      parent = hit.folder_id as string;
      continue;
    }
    const safe = part.replace(/'/g, "\\'");
    const found = await withRetry(() =>
      d.files.list({
        q: `'${parent}' in parents and name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id)",
        pageSize: 1,
      }),
    );
    let id = found.data.files?.[0]?.id ?? null;
    if (!id) {
      const created = await withRetry(() =>
        d.files.create({
          requestBody: { name: part, mimeType: "application/vnd.google-apps.folder", parents: [parent] },
          fields: "id",
        }),
      );
      id = created.data.id ?? null;
    }
    if (!id) throw new Error(`Could not create the Drive folder ${sofar}.`);
    await admin.from("storage_folders").upsert({ provider: "gdrive", path: sofar, folder_id: id });
    parent = id;
  }
  return parent;
}

export const driveProvider: StorageProvider = {
  name: "gdrive",

  async isConfigured() {
    if (!googleAppConfigured()) return false;
    const conn = await getConnection();
    return !!conn?.root_folder_id;
  },

  async putObject({ kind, fileId, programSlug, body, contentType }: PutInput) {
    const { d, rootFolderId } = await api();
    const month = new Date().toISOString().slice(0, 7);
    const parent = await folderId(d, rootFolderId, kind === "original" ? `originals/${programSlug}/${month}` : "thumbs");
    const res = await withRetry(() =>
      d.files.create({
        requestBody: { name: `${fileId}.jpg`, parents: [parent], appProperties: { kind, photo: fileId } },
        media: { mimeType: contentType, body: Readable.from(Buffer.from(body)) },
        fields: "id",
      }),
    );
    if (!res.data.id) throw new Error("Google Drive did not return a file id.");
    return { key: res.data.id };
  },

  async head(key) {
    try {
      const { d } = await api();
      const res = await d.files.get({ fileId: key, fields: "size, trashed" });
      if (res.data.trashed) return null;
      return { size: Number(res.data.size ?? 0) };
    } catch (err) {
      if ((err as { code?: number }).code === 404) return null;
      throw err;
    }
  },

  async getBytes(key) {
    const { d } = await api();
    const res = await withRetry(() => d.files.get({ fileId: key, alt: "media" }, { responseType: "stream" }));
    const stream = res.data as unknown as Readable;
    return {
      body: Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>,
      contentType: String(res.headers?.["content-type"] ?? "image/jpeg"),
    };
  },

  thumbUrl(photoId) {
    return `/api/media/${photoId}?v=thumb`;
  },

  async originalUrl(photoId) {
    return `/api/media/${photoId}?v=original`;
  },

  async delete(keys) {
    const { d } = await api();
    for (const fileId of keys) {
      try {
        await withRetry(() => d.files.delete({ fileId }));
      } catch (err) {
        if ((err as { code?: number }).code !== 404) throw err; // already gone is fine
      }
    }
  },

  async quota() {
    const { d } = await api();
    const res = await withRetry(() => d.about.get({ fields: "storageQuota" }));
    const q = res.data.storageQuota;
    return { usedBytes: Number(q?.usage ?? 0), limitBytes: q?.limit ? Number(q.limit) : null };
  },
};

/** Creates the app's root folder in the connected account (called once, when an admin connects). */
export async function createRootFolder(client: unknown, name: string): Promise<string> {
  const d = drive({ version: "v3", auth: client as drive_v3.Options["auth"] });
  const res = await d.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  if (!res.data.id) throw new Error("Could not create the app folder in Google Drive.");
  return res.data.id;
}
