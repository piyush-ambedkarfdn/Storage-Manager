"use client";

import { CheckCircle2, CircleAlert, Copy, Loader2, Plus, RotateCcw, Trash2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlobThumb } from "@/components/upload/Dropzone";
import type { useUploadQueue } from "@/hooks/useUploadQueue";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages, type UploadKey } from "@/lib/i18n/messages/upload";
import { reviewMessages } from "@/lib/i18n/messages/review";
import type { TFunction } from "@/lib/i18n";
import type { QueueItem } from "@/lib/upload/queue-db";

type Queue = ReturnType<typeof useUploadQueue>;

function statusText(i: QueueItem, t: TFunction<UploadKey>) {
  if (i.status === "working") return t(i.stage || "uploading");
  if (i.status === "waiting") return t("waiting");
  if (i.status === "done") return t("finished");
  if (i.status === "duplicate") return t("duplicate");
  return t("failed");
}

/** Per-photo progress with clear states, retry, and an offline notice. */
export function UploadQueue({ queue, onNewBatch }: { queue: Queue; onNewBatch?: () => void }) {
  const t = useT(uploadMessages);
  const tr = useT(reviewMessages);
  const { items, batches, counts, online } = queue;
  const newBatchButton = onNewBatch ? (
    <Button className="min-h-12 w-full text-base" onClick={onNewBatch}>
      <Plus aria-hidden /> {t("newBatch")}
    </Button>
  ) : null;

  if (!items.length) {
    return (
      <section className="flex flex-col gap-3" aria-label={t("queueTitle")}>
        <p className="text-sm text-muted-foreground">{t("queueEmpty")}</p>
        {newBatchButton}
      </section>
    );
  }
  const savedReports = batches.filter((b) => b.reportId).length;
  const allFinished = counts.pending === 0 && counts.failed === 0;

  return (
    <section className="flex flex-col gap-3" aria-label={t("queueTitle")}>
      {allFinished ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-success bg-success/10 p-3">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5 text-success" aria-hidden /> {t("allDone")}
          </p>
          <p className="text-sm text-muted-foreground">{tr("sentForReview")}</p>
          {newBatchButton}
        </div>
      ) : null}
      {!online ? (
        <div role="status" className="flex items-start gap-2 rounded-md border border-marigold bg-marigold/15 px-3 py-2 text-sm">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("offline")}
        </div>
      ) : null}
      {savedReports ? (
        <div role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm">
          {t("reportSaved")}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("summary", { done: counts.done + counts.duplicate, pending: counts.pending - counts.failed, failed: counts.failed })}
      </p>

      {batches.map((b) => {
        const mine = items.filter((i) => i.batchId === b.id);
        if (!mine.length) return null;
        return (
          <div key={b.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{b.label}</h3>
            <ul className="flex flex-col gap-2">
              {mine.map((i) => {
                const pct = i.status === "done" || i.status === "duplicate" ? 100 : Math.round(i.progress * 100);
                const color =
                  i.status === "failed" ? "bg-destructive" : i.status === "done" ? "bg-success" : i.status === "duplicate" ? "bg-muted-foreground" : "bg-primary";
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                    <div className="w-14 shrink-0">
                      {i.prepared?.thumb || i.file ? <BlobThumb blob={(i.prepared?.thumb ?? i.file) as Blob} alt="" /> : <div className="aspect-square rounded-md bg-photo-surface" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-semibold">{i.name}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                          {i.status === "working" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                          {i.status === "done" ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : null}
                          {i.status === "duplicate" ? <Copy className="size-3.5" aria-hidden /> : null}
                          {i.status === "failed" ? <CircleAlert className="size-3.5 text-destructive" aria-hidden /> : null}
                          {statusText(i, t)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={i.name}>
                        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      {i.status === "failed" ? (
                        <p className="text-xs text-muted-foreground">
                          {i.error} {i.retryable ? t("willRetry") : null}
                        </p>
                      ) : null}
                    </div>
                    {i.status === "failed" ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button size="sm" variant="outline" className="min-h-9" onClick={() => queue.retry(i.id)}>
                          <RotateCcw aria-hidden /> {t("retry")}
                        </Button>
                        {!i.retryable ? (
                          <Button size="sm" variant="ghost" className="min-h-9" onClick={() => queue.remove(i.id)} aria-label={t("removePhoto")}>
                            <Trash2 aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {counts.failed ? (
          <Button variant="outline" className="min-h-11" onClick={() => queue.retry()}>
            <RotateCcw aria-hidden /> {t("retryAll")}
          </Button>
        ) : null}
        {counts.done + counts.duplicate > 0 ? (
          <Button variant="outline" className="min-h-11" onClick={() => queue.clearDone()}>
            {t("clearDone")}
          </Button>
        ) : null}
      </div>
      {/* while photos are still uploading staff can already start the next batch; the queue keeps working */}
      {!allFinished ? newBatchButton : null}
    </section>
  );
}