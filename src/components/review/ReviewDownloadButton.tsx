"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/hooks/useOptions";
import { runDownload } from "@/lib/download/run-download";
import { useT } from "@/lib/i18n/provider";
import { reviewMessages } from "@/lib/i18n/messages/review";
import type { DownloadManifest } from "@/types/gallery";

/**
 * Admin only: downloads the photos waiting for review as a ZIP, Village / Activity type / photos.
 * Pass `photoIds` for chosen photos; without it every waiting photo is downloaded.
 */
export function ReviewDownloadButton({ photoIds, label, variant = "outline", className }: { photoIds?: string[]; label: string; variant?: "default" | "outline" | "ghost"; className?: string }) {
  const t = useT(reviewMessages);
  const [busy, setBusy] = useState<"list" | "files" | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abort = useRef<AbortController | null>(null);

  async function start() {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy("list");
    try {
      const manifest = await requestJson<DownloadManifest>("/api/review/download-manifest", { method: "POST", body: photoIds ? { photoIds } : { all: true } });
      if (!manifest.files.length) {
        toast.info(t("none"));
        return;
      }
      setBusy("files");
      setProgress({ done: 0, total: manifest.files.length });
      const { savedIds, failed } = await runDownload(manifest, {
        mode: "zip",
        zipName: `photos-for-review-${new Date().toISOString().slice(0, 10)}`,
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ done: p.done, total: p.total }),
      });
      if (ctrl.signal.aborted) return;
      if (failed.length) toast.error(t("failedSome", { n: failed.length }));
      if (savedIds.length) toast.success(t("saved", { n: savedIds.length }));
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(err instanceof Error && err.message ? err.message : t("downloadFailed"));
    } finally {
      setBusy(null);
      abort.current = null;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant={variant} className={className ?? "min-h-10"} disabled={busy !== null} onClick={() => void start()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        {busy === "list" ? t("preparing") : busy === "files" ? t("saving", progress) : label}
      </Button>
      {busy ? (
        <Button type="button" variant="ghost" className="min-h-10" onClick={() => abort.current?.abort()}>
          {t("cancel")}
        </Button>
      ) : null}
    </div>
  );
}
