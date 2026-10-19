"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/components/storage/StorageOverview";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import { storageMessages } from "@/lib/i18n/messages/storage";
import type { MoveBatchResult, MovePreview } from "@/types/cleanup";
import type { ProviderName } from "@/types/storage";

/**
 * Move photos from one storage to the other in small batches driven by this page (no long server job).
 * Per photo: copy, check, update, then delete the old copy. Failed photos are skipped and listed.
 */
export function MoveStoragePanel({ gdriveReady, r2Ready }: { gdriveReady: boolean; r2Ready: boolean }) {
  const t = useT(cleanupMessages);
  const ts = useT(storageMessages);
  const qc = useQueryClient();
  const [from, setFrom] = useState<ProviderName>("r2");
  const to: ProviderName = from === "r2" ? "gdrive" : "r2";
  const [preview, setPreview] = useState<MovePreview | null>(null);
  const [running, setRunning] = useState(false);
  const [moved, setMoved] = useState(0);
  const [failed, setFailed] = useState<MoveBatchResult["failed"]>([]);
  const stop = useRef(false);
  const ready = to === "gdrive" ? gdriveReady : r2Ready;

  async function check() {
    try {
      setPreview(await requestJson<MovePreview>("/api/storage/move/preview", { method: "POST", body: { from, to } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function run() {
    setRunning(true);
    stop.current = false;
    setMoved(0);
    setFailed([]);
    let total = 0;
    const bad: MoveBatchResult["failed"] = [];
    try {
      while (!stop.current) {
        const r = await requestJson<MoveBatchResult>("/api/storage/move/run", {
          method: "POST",
          body: { from, to, limit: 10, exclude: bad.map((f) => f.id) },
        });
        total += r.moved;
        bad.push(...r.failed);
        setMoved(total);
        setFailed([...bad]);
        if (r.remaining === 0 || (r.moved === 0 && r.failed.length === 0)) break;
      }
      toast.success(t("moveDone", { moved: total, failed: bad.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setPreview(null);
      await Promise.all(["storage-usage", "gallery"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{t("moveTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("moveBody")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{t("moveFrom")}</span>
        <div role="group" className="flex overflow-hidden rounded-md border">
          {(["r2", "gdrive"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={from === p}
              disabled={running}
              onClick={() => {
                setFrom(p);
                setPreview(null);
              }}
              className={`min-h-10 px-3 text-sm ${from === p ? "bg-secondary font-semibold" : "bg-card"}`}
            >
              {ts(p)}
            </button>
          ))}
        </div>
        <ArrowRight className="size-4" aria-hidden />
        <b className="text-sm">{ts(to)}</b>
        <Button variant="outline" className="min-h-10" onClick={check} disabled={running || !ready}>
          {t("movePreview")}
        </Button>
      </div>
      {!ready ? <p className="text-sm text-muted-foreground">{t("moveNotReady", { to: ts(to) })}</p> : null}
      {preview && !running ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{t("moveCount", { n: preview.count, size: formatBytes(preview.bytes), from: ts(from) })}</p>
          {preview.count ? (
            <Button className="min-h-10" onClick={run}>
              {t("moveStart", { to: ts(to) })}
            </Button>
          ) : null}
        </div>
      ) : null}
      {running || moved || failed.length ? (
        <div className="flex flex-wrap items-center gap-3 text-sm" role="status" aria-live="polite">
          <span>{t("moving", { moved, failed: failed.length })}</span>
          {running ? (
            <>
              <span className="text-muted-foreground">{t("moveKeepTab")}</span>
              <Button variant="outline" size="sm" className="min-h-9" onClick={() => (stop.current = true)}>
                {t("moveStop")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {failed.length ? (
        <ul className="max-h-32 overflow-y-auto font-mono text-xs text-muted-foreground">
          {failed.map((f) => (
            <li key={f.id}>
              {f.id.slice(0, 8)}: {f.error}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
