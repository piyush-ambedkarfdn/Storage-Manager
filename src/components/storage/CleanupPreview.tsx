"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArchiveDialog } from "@/components/storage/ArchiveDialog";
import { CleanupFilters } from "@/components/storage/CleanupFilters";
import { formatBytes } from "@/components/storage/StorageOverview";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import type { ApplyResult, CleanupFilters as Filters, CleanupPreview as Preview } from "@/types/cleanup";

/** Free space: choose filters, preview count and size (protected photos skipped), then trash or archive. */
export function CleanupPreview({ trashDays }: { trashDays: number }) {
  const t = useT(cleanupMessages);
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ olderThanDays: 360, only: null });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [failed, setFailed] = useState<ApplyResult["failed"]>([]);

  const refresh = () =>
    Promise.all(["storage-usage", "trash", "gallery", "gallery-tree"].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  async function check(f = filters) {
    setBusy(true);
    setFailed([]);
    try {
      setPreview(await requestJson<Preview>("/api/storage/cleanup/preview", { method: "POST", body: f }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{t("cleanupTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("cleanupBody")}</p>
      </div>
      <CleanupFilters
        value={filters}
        onChange={(f) => {
          setFilters(f);
          setPreview(null);
        }}
      />
      <Button variant="outline" className="min-h-10 self-start" onClick={() => check()} disabled={busy}>
        {busy ? t("previewing") : t("preview")}
      </Button>

      {preview ? (
        preview.count === 0 ? (
          <p className="text-sm">{t("previewNone")}</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-md border bg-secondary/40 p-3">
            <p className="font-semibold" role="status">
              {t("previewResult", { n: preview.count, size: formatBytes(preview.bytes) })}
            </p>
            <ul className="flex flex-wrap gap-1">
              {preview.sample.map((s) => (
                <li key={s.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
                  <img src={s.thumbUrl} alt="" className="size-12 rounded object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
            <p className="text-sm">{t("trashFrees", { size: formatBytes(preview.bytes), days: trashDays })}</p>
            <p className="text-sm">{t("archiveFrees", { size: formatBytes(preview.archiveBytes) })}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-10" onClick={() => setConfirmTrash(true)}>
                {t("moveToTrash")}
              </Button>
              <Button variant="destructive" className="min-h-10" onClick={() => setArchiveOpen(true)}>
                {t("archive")}
              </Button>
            </div>
          </div>
        )
      ) : null}

      {failed.length ? (
        <div className="text-sm">
          <p className="font-semibold text-destructive">{t("someFailed", { n: failed.length })}</p>
          <ul className="max-h-32 overflow-y-auto font-mono text-xs">
            {failed.map((f) => (
              <li key={f.id}>
                {f.id.slice(0, 8)}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmTrash}
        onOpenChange={setConfirmTrash}
        title={`${t("moveToTrash")}: ${preview?.count ?? 0}`}
        body={t("trashFrees", { size: formatBytes(preview?.bytes ?? 0), days: trashDays })}
        confirmLabel={t("moveToTrash")}
        onConfirm={async () => {
          try {
            const r = await requestJson<ApplyResult>("/api/storage/cleanup/apply", { method: "POST", body: { filters, action: "trash" } });
            toast.success(t("trashed", { n: r.done }));
            setPreview(null);
            await refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
      {archiveOpen && preview ? (
        <ArchiveDialog
          open
          onOpenChange={setArchiveOpen}
          filters={filters}
          count={preview.count}
          onDone={(n, f) => {
            toast.success(t("archived", { n }));
            setFailed(f);
            setPreview(null);
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}
