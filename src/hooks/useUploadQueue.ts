"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isEnabled } from "@/config/features";
import { useProfile } from "@/hooks/useProfile";
import { uuid } from "@/lib/uuid";
import {
  addBatch,
  clearFinished,
  deleteItem,
  getBatch,
  listBatches,
  listItems,
  resetInterrupted,
  updateBatch,
  updateItem,
  type PhotoOverride,
  type QueueBatch,
  type QueueItem,
} from "@/lib/upload/queue-db";
import { ensureReport, uploadItem, UploadError } from "@/lib/upload/upload-file";
import type { BatchDetails } from "@/lib/schemas/report";

const RETRY_STEPS_MS = [10_000, 30_000, 2 * 60_000, 5 * 60_000, 15 * 60_000];
const FULL_STORAGE_WAIT_MS = 30 * 60_000;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export type NewPhoto = {
  /** the (already shrunk) photo */
  file: Blob;
  name: string;
  override: PhotoOverride;
  prepared?: { width: number; height: number; thumb: Blob; takenAt: string | null };
};

/**
 * The upload queue: one photo at a time, saved in IndexedDB, resumes after reload or when the
 * network returns, retries with growing waits. Nothing is dropped silently: a photo either finishes,
 * is recognised as a duplicate, or stays in the list as "failed" with a reason and a Retry button.
 */
export function useUploadQueue() {
  const profile = useProfile();
  const qc = useQueryClient();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [batches, setBatches] = useState<QueueBatch[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [b, i] = await Promise.all([listBatches(profile.id), listItems(profile.id)]);
    setBatches(b);
    setItems(i);
    setLoaded(true);
  }, [profile.id]);

  const work = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    setBusy(true);
    try {
      for (;;) {
        if (!navigator.onLine) break;
        const now = Date.now();
        const next = (await listItems(profile.id)).find(
          (i) => (i.status === "waiting" || (i.status === "failed" && i.retryable)) && i.nextTryAt <= now,
        );
        if (!next) break;
        const batch = await getBatch(next.batchId);
        if (!batch) {
          await deleteItem(next.id);
          continue;
        }
        await updateItem(next.id, { status: "working", stage: "compressing", progress: 0, error: null });
        await refresh();
        try {
          const reportId = await ensureReport(batch);
          if (!batch.reportId) await updateBatch(batch.id, { reportId });
          let lastPaint = 0;
          const result = await uploadItem(next, { ...batch, reportId }, (stage, progress) => {
            setItems((list) => list.map((i) => (i.id === next.id ? { ...i, stage, progress } : i)));
            if (Date.now() - lastPaint > 1500) {
              lastPaint = Date.now();
              void updateItem(next.id, { stage, progress });
            }
          });
          await updateItem(next.id, { status: result.status, stage: "", progress: 1, photoId: result.photoId, file: null, error: null });
        } catch (err) {
          const e = err instanceof UploadError ? err : new UploadError(err instanceof Error ? err.message : String(err), true);
          const attempts = next.attempts + 1;
          const wait = e.status === 507 ? FULL_STORAGE_WAIT_MS : RETRY_STEPS_MS[Math.min(attempts - 1, RETRY_STEPS_MS.length - 1)];
          await updateItem(next.id, {
            status: "failed",
            stage: "",
            progress: 0,
            error: e.message,
            retryable: e.retryable,
            attempts,
            nextTryAt: Date.now() + wait,
          });
          if (!navigator.onLine) break;
        }
        await refresh();
      }
    } finally {
      running.current = false;
      setBusy(false);
      await refresh();
      void qc.invalidateQueries({ queryKey: ["my-reports"] });
      void qc.invalidateQueries({ queryKey: ["storage-usage"] });
    }
  }, [profile.id, refresh, qc]);

  const run = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    // Only one tab works the queue at a time (others skip), so a photo is never sent twice in parallel.
    if (navigator.locks) {
      await navigator.locks.request("storage-org-upload-queue", { ifAvailable: true }, async (lock) => {
        if (lock) await work();
      });
    } else {
      await work();
    }
  }, [work]);

  // load, repair interrupted work, start
  useEffect(() => {
    let alive = true;
    (async () => {
      await resetInterrupted(profile.id);
      if (alive) {
        await refresh();
        void run();
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile.id, refresh, run]);

  // network back: continue; and wake up regularly for scheduled retries
  useEffect(() => {
    if (online) void run();
    const timer = setInterval(() => void run(), 20_000);
    return () => clearInterval(timer);
  }, [online, run]);

  // When a batch has finished, ask the AI (phase 8) to summarise its report. Fire and forget.
  const notified = useRef(new Set<string>());
  useEffect(() => {
    if (!isEnabled("ai")) return;
    for (const b of batches) {
      if (!b.reportId || notified.current.has(b.id)) continue;
      const mine = items.filter((i) => i.batchId === b.id);
      if (mine.length && mine.every((i) => i.status === "done" || i.status === "duplicate")) {
        notified.current.add(b.id);
        // programs without report questions (for example meetings) have nothing to summarise
        if (Object.values(b.details.report_parts ?? {}).some((v) => typeof v === "string" && v.trim())) {
          void fetch("/api/ai/summarize-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportId: b.reportId }),
          }).catch(() => undefined);
        }
        const photoIds = mine.map((i) => i.photoId).filter(Boolean);
        if (photoIds.length) {
          void fetch("/api/ai/describe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoIds }),
          }).catch(() => undefined);
        }
      }
    }
  }, [batches, items]);

  const add = useCallback(
    async (details: BatchDetails, label: string, photos: NewPhoto[]) => {
      const now = Date.now();
      const batch: QueueBatch = { id: uuid(), userId: profile.id, createdAt: now, details, label, reportId: null };
      const queued: QueueItem[] = photos.map((p, i) => ({
        id: uuid(),
        batchId: batch.id,
        userId: profile.id,
        name: p.name || `photo-${i + 1}.jpg`,
        file: p.file,
        prepared: p.prepared ?? null,
        status: "waiting",
        stage: "",
        progress: 0,
        error: null,
        retryable: true,
        attempts: 0,
        nextTryAt: 0,
        override: p.override,
        photoId: null,
        createdAt: now + i,
      }));
      await addBatch(batch, queued);
      await refresh();
      void run();
      return batch.id;
    },
    [profile.id, refresh, run],
  );

  const retry = useCallback(
    async (id?: string) => {
      const targets = id ? items.filter((i) => i.id === id) : items.filter((i) => i.status === "failed");
      for (const i of targets) await updateItem(i.id, { status: "waiting", nextTryAt: 0, error: null, retryable: true });
      await refresh();
      void run();
    },
    [items, refresh, run],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteItem(id);
      await refresh();
    },
    [refresh],
  );

  const clearDone = useCallback(async () => {
    await clearFinished(profile.id);
    await refresh();
  }, [profile.id, refresh]);

  const counts = {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    duplicate: items.filter((i) => i.status === "duplicate").length,
    failed: items.filter((i) => i.status === "failed").length,
    pending: items.filter((i) => i.status === "waiting" || i.status === "working" || (i.status === "failed" && i.retryable)).length,
  };

  return { loaded, online, busy, batches, items, counts, add, retry, remove, clearDone };
}
