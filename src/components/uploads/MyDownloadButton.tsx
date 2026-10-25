"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/hooks/useOptions";
import { runDownload } from "@/lib/download/run-download";
import { useT } from "@/lib/i18n/provider";
import { myDownloadMessages } from "@/lib/i18n/messages/my-download";
import type { DownloadManifest } from "@/types/gallery";

/**
 * Downloads the person's own photos as a ZIP: Village / Activity type / photos (the list comes from the server,
 * the browser fetches the files and zips them). Pass `photoIds` for some photos; without it every one of my photos is downloaded.
 */
export function MyDownloadButton({
  photoIds,
  label,
  variant = "outline",
  className,
}: {
  /** some of my photos; leave out for all of them */
  photoIds?: string[];
  label: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const t = useT(myDownloadMessages);
  const [busy, setBusy] = useState<"list" | "files" | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abort = useRef<AbortController | null>(null);

  async function start() {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy("list");
    try {
      const manifest = await requestJson<DownloadManifest>("/api/my-download-manifest", { method: "POST", body: photoIds ? { photoIds } : { all: true } });
      if (!manifest.files.length) {
        toast.info(t("none"));
        return;
      }
      setBusy("files");
      setProgress({ done: 0, total: manifest.files.length });
      const stamp = new Date().toISOString().slice(0, 10);
      const { savedIds, failed } = await runDownload(manifest, {
        mode: "zip",
        zipName: `my-photos-${stamp}`,
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ done: p.done, total: p.total }),
      });
      if (ctrl.signal.aborted) return;
      if (failed.length) toast.error(t("failedSome", { n: failed.length }));
      if (savedIds.length) toast.success(t("saved", { n: savedIds.length }));
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(err instanceof Error && err.message ? err.message : t("failed"));
    } finally {
      setBusy(null);
      abort.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button type="button" variant={variant} className={className ?? "min-h-11"} disabled={busy !== null} onClick={() => void start()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {busy === "list" ? t("preparing") : busy === "files" ? t("saving", progress) : label}
        </Button>
        {busy ? (
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => abort.current?.abort()}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
