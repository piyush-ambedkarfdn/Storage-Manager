import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { BatchDetails } from "@/lib/schemas/report";

/**
 * The phone's upload queue in IndexedDB. Batches (with the typed report) and photo files survive
 * reloads, closed tabs and lost network, so nothing a field worker typed or picked is lost.
 */

export type QueueStatus = "waiting" | "working" | "done" | "duplicate" | "failed";

export type PhotoOverride = {
  village_id?: string | null;
  panchayat_id?: string | null;
  block_id?: string | null;
  village_name?: string | null;
  note?: string;
  has_children: boolean;
};

export type QueueBatch = {
  id: string; // also the report's client_ref
  userId: string;
  createdAt: number;
  details: BatchDetails;
  /** shown in the queue: "Village 1 · Training" */
  label: string;
  reportId: string | null;
};

export type QueueItem = {
  id: string;
  batchId: string;
  userId: string;
  name: string;
  /** the original file; removed once uploaded to free phone storage */
  file: Blob | null;
  status: QueueStatus;
  stage: "" | "compressing" | "checking" | "uploading" | "saving";
  progress: number;
  error: string | null;
  /** false = will not succeed by retrying (e.g. not a photo) */
  retryable: boolean;
  attempts: number;
  nextTryAt: number;
  override: PhotoOverride;
  photoId: string | null;
  createdAt: number;
};

interface QueueDB extends DBSchema {
  batches: { key: string; value: QueueBatch; indexes: { byUser: string } };
  items: { key: string; value: QueueItem; indexes: { byBatch: string; byUser: string } };
}

let dbPromise: Promise<IDBPDatabase<QueueDB>> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB<QueueDB>("storage-org-upload", 1, {
      upgrade(d) {
        const b = d.createObjectStore("batches", { keyPath: "id" });
        b.createIndex("byUser", "userId");
        const i = d.createObjectStore("items", { keyPath: "id" });
        i.createIndex("byBatch", "batchId");
        i.createIndex("byUser", "userId");
      },
    });
  }
  return dbPromise;
}

export async function addBatch(batch: QueueBatch, items: QueueItem[]): Promise<void> {
  const tx = (await db()).transaction(["batches", "items"], "readwrite");
  await tx.objectStore("batches").put(batch);
  for (const it of items) await tx.objectStore("items").put(it);
  await tx.done;
}

export async function listBatches(userId: string): Promise<QueueBatch[]> {
  return (await (await db()).getAllFromIndex("batches", "byUser", userId)).sort((a, b) => a.createdAt - b.createdAt);
}

export async function listItems(userId: string): Promise<QueueItem[]> {
  return (await (await db()).getAllFromIndex("items", "byUser", userId)).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getBatch(id: string) {
  return (await db()).get("batches", id);
}

export async function updateBatch(id: string, patch: Partial<QueueBatch>): Promise<void> {
  const d = await db();
  const b = await d.get("batches", id);
  if (b) await d.put("batches", { ...b, ...patch });
}

export async function updateItem(id: string, patch: Partial<QueueItem>): Promise<void> {
  const d = await db();
  const it = await d.get("items", id);
  if (it) await d.put("items", { ...it, ...patch });
}

export async function deleteItem(id: string): Promise<void> {
  await (await db()).delete("items", id);
}

/** Removes finished photos, and batches with nothing left. */
export async function clearFinished(userId: string): Promise<void> {
  const d = await db();
  for (const it of await d.getAllFromIndex("items", "byUser", userId)) {
    if (it.status === "done" || it.status === "duplicate") await d.delete("items", it.id);
  }
  const left = new Set((await d.getAllFromIndex("items", "byUser", userId)).map((i) => i.batchId));
  for (const b of await d.getAllFromIndex("batches", "byUser", userId)) {
    if (!left.has(b.id)) await d.delete("batches", b.id);
  }
}

/** After a reload, work that was cut off midway starts again. */
export async function resetInterrupted(userId: string): Promise<void> {
  const d = await db();
  for (const it of await d.getAllFromIndex("items", "byUser", userId)) {
    if (it.status === "working") await d.put("items", { ...it, status: "waiting", stage: "", progress: 0 });
  }
}
