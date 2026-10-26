import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { TTL } from "@/lib/drafts/store";
import type { PhotoOverride } from "@/lib/upload/queue-db";

/**
 * The half-filled upload form (step 1 answers, and the photos picked in step 2) in IndexedDB, one draft per signed-in
 * person. It lets someone switch tabs, reload or close the page and come back to the same screen.
 * The answers are one small record that is rewritten as the person types. Each photo (already shrunk, about 0.5 MB)
 * is written once, when it is ready, so typing never rewrites the photos. A draft is deleted 24 hours after its last change.
 */

export type DraftForm = {
  step: 1 | 2;
  place: unknown;
  activity: string;
  date: string;
  dateTouched: boolean;
  dateFromPhoto: boolean;
  takenBy: string;
  report: { what_happened: string; problem: string; who_affected: string; result: string };
  themes: string[];
  consent: "yes" | "no" | "unknown";
  people: string;
};

/** The parts of a photo that never change after it is prepared. */
export type DraftPhotoData = {
  key: string;
  name: string;
  file: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt: string | null;
};

export type DraftPhotoRecord = DraftPhotoData & { override: PhotoOverride };

type DraftHead = { userId: string; savedAt: number; expiresAt: number; form: DraftForm; photos: { key: string; override: PhotoOverride }[] };
type StoredPhoto = { id: string; userId: string; data: DraftPhotoData };

interface DraftDB extends DBSchema {
  drafts: { key: string; value: DraftHead };
  photos: { key: string; value: StoredPhoto; indexes: { byUser: string } };
}

let dbPromise: Promise<IDBPDatabase<DraftDB>> | null = null;
function db() {
  dbPromise ??= openDB<DraftDB>("storage-organiser-drafts", 1, {
    upgrade(d) {
      d.createObjectStore("drafts", { keyPath: "userId" });
      d.createObjectStore("photos", { keyPath: "id" }).createIndex("byUser", "userId");
    },
  });
  return dbPromise;
}

const photoId = (userId: string, key: string) => `${userId}:${key}`;

/** Writes one prepared photo (call once per photo). */
export async function saveDraftPhoto(userId: string, data: DraftPhotoData): Promise<boolean> {
  try {
    await (await db()).put("photos", { id: photoId(userId, data.key), userId, data });
    return true;
  } catch (err) {
    console.warn("[draft] could not keep a photo", err);
    return false;
  }
}

export async function removeDraftPhoto(userId: string, key: string): Promise<void> {
  try {
    await (await db()).delete("photos", photoId(userId, key));
  } catch {
    /* ignore */
  }
}

/** Writes the answers and which photos belong to the draft (with their per-photo choices). */
export async function saveDraftForm(userId: string, form: DraftForm, photos: { key: string; override: PhotoOverride }[], now = Date.now()): Promise<void> {
  try {
    await (await db()).put("drafts", { userId, savedAt: now, expiresAt: now + TTL.upload, form, photos });
  } catch (err) {
    console.warn("[draft] could not save", err);
  }
}

export type LoadedDraft = { savedAt: number; form: DraftForm; photos: DraftPhotoRecord[] };

export async function loadUploadDraft(userId: string, now = Date.now()): Promise<LoadedDraft | null> {
  try {
    const d = await db();
    const head = await d.get("drafts", userId);
    if (!head) return null;
    if (head.expiresAt <= now) {
      await clearUploadDraft(userId);
      return null;
    }
    const photos: DraftPhotoRecord[] = [];
    for (const p of head.photos) {
      const row = await d.get("photos", photoId(userId, p.key));
      if (row) photos.push({ ...row.data, override: p.override });
    }
    return { savedAt: head.savedAt, form: head.form, photos };
  } catch {
    return null;
  }
}

export async function clearUploadDraft(userId: string): Promise<void> {
  try {
    const d = await db();
    const tx = d.transaction(["drafts", "photos"], "readwrite");
    await tx.objectStore("drafts").delete(userId);
    const index = tx.objectStore("photos").index("byUser");
    for (let cursor = await index.openCursor(userId); cursor; cursor = await cursor.continue()) await cursor.delete();
    await tx.done;
  } catch {
    /* ignore */
  }
}

/** Removes drafts past their 24 hours, with their photos. */
export async function purgeExpiredUploadDrafts(now = Date.now()): Promise<void> {
  try {
    const d = await db();
    for (const head of await d.getAll("drafts")) if (head.expiresAt <= now) await clearUploadDraft(head.userId);
  } catch {
    /* ignore */
  }
}

/** Sign-out: remove every draft on this device. */
export async function clearAllUploadDrafts(): Promise<void> {
  try {
    const d = await db();
    await d.clear("drafts");
    await d.clear("photos");
  } catch {
    /* ignore */
  }
}
