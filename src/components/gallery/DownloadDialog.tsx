"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { requestJson } from "@/hooks/useOptions";
import { fileNameFor, folderFor } from "@/lib/download/paths";
import { supportsFolderWrite } from "@/lib/download/fs-writer";
import { runDownload, type DownloadMode, type DownloadProgress } from "@/lib/download/run-download";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages, type GalleryKey } from "@/lib/i18n/messages/gallery";
import { commonMessages } from "@/lib/i18n/messages/common";
import { DOWNLOAD_LEVELS, type DownloadLevel, type DownloadManifest } from "@/types/gallery";

const PRESET_A: DownloadLevel[] = ["program", "village", "month"];
const PRESET_B: DownloadLevel[] = ["district", "panchayat", "month"];
const DEFAULT_TEMPLATE = "{date}_{village}_{activity}_{seq}";
const SAMPLE = {
  program: "Samvidhan Se Samman",
  district: "Chatra",
  block: "Itkhori",
  panchayat: "Panchayat A",
  village: "Village 1",
  activity: "Training",
  date: "2026-10-14",
  id: "0000000000",
};

/** Download the current view or the selection into structured folders (or ZIP parts) with _metadata.csv. */
export function DownloadDialog({
  open,
  onOpenChange,
  viewQuery,
  viewCount,
  selectedIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewQuery: string;
  viewCount: number | null;
  selectedIds: string[];
}) {
  const t = useT(galleryMessages);
  const tc = useT(commonMessages);
  const [scope, setScope] = useState<"view" | "selection">(selectedIds.length ? "selection" : "view");
  const [order, setOrder] = useState<DownloadLevel[]>([...PRESET_A, ...DOWNLOAD_LEVELS.filter((l) => !PRESET_A.includes(l))]);
  const [on, setOn] = useState<Set<DownloadLevel>>(new Set(PRESET_A));
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [mode, setMode] = useState<DownloadMode>(supportsFolderWrite() ? "folder" : "zip");
  const [stage, setStage] = useState<"idle" | "preparing" | "running" | "done">("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [result, setResult] = useState<{ saved: number; failed: DownloadProgress["failed"]; archived: number } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const levels = order.filter((l) => on.has(l));
  const examplePath = [...folderFor(levels, SAMPLE), fileNameFor(template || DEFAULT_TEMPLATE, SAMPLE, 1)].join("/");

  function preset(p: DownloadLevel[]) {
    setOrder([...p, ...DOWNLOAD_LEVELS.filter((l) => !p.includes(l))]);
    setOn(new Set(p));
  }
  function move(i: number, d: -1 | 1) {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  }

  async function start() {
    setStage("preparing");
    setResult(null);
    abort.current = new AbortController();
    try {
      const manifest = await requestJson<DownloadManifest>("/api/download-manifest", {
        method: "POST",
        body: { ...(scope === "selection" ? { photoIds: selectedIds } : { query: viewQuery }), levels, template: template || DEFAULT_TEMPLATE },
      });
      setStage("running");
      const zipName = `photos-${new Date().toISOString().slice(0, 10)}`;
      const { savedIds, failed } = await runDownload(manifest, { mode, zipName, signal: abort.current.signal, onProgress: setProgress });
      if (savedIds.length) {
        await requestJson("/api/download-log", { method: "POST", body: { photoIds: savedIds } }).catch(() => undefined);
      }
      setResult({ saved: savedIds.length, failed, archived: manifest.skippedArchived });
      setStage("done");
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error(err instanceof Error ? err.message : String(err));
      setStage("idle");
    }
  }

  const busy = stage === "preparing" || stage === "running";
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("downloadTitle")}</DialogTitle>
          <DialogDescription>{t("metadataNote")}</DialogDescription>
        </DialogHeader>

        {stage === "idle" ? (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t("scope")}</legend>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as "view" | "selection")}>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="view" /> {t("scopeView", { n: viewCount ?? "…" })}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="selection" disabled={!selectedIds.length} /> {t("scopeSelection", { n: selectedIds.length })}
                </label>
              </RadioGroup>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t("levels")}</legend>
              <p className="text-xs text-muted-foreground">{t("levelsHint")}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-muted-foreground">{t("presets")}:</span>
                <Button size="sm" variant="outline" className="h-8" onClick={() => preset(PRESET_A)}>
                  {t("presetA")}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => preset(PRESET_B)}>
                  {t("presetB")}
                </Button>
              </div>
              <ol className="flex flex-col rounded-md border">
                {order.map((l, i) => (
                  <li key={l} className="flex items-center gap-2 border-b px-2 py-1 last:border-b-0">
                    <Checkbox
                      id={`lvl-${l}`}
                      checked={on.has(l)}
                      onCheckedChange={(c) => {
                        const next = new Set(on);
                        if (c) next.add(l);
                        else next.delete(l);
                        setOn(next);
                      }}
                    />
                    <label htmlFor={`lvl-${l}`} className="flex-1 text-sm">
                      {t(`lvl_${l}` as GalleryKey)}
                    </label>
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`↑ ${l}`}>
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`↓ ${l}`}>
                      <ArrowDown aria-hidden />
                    </Button>
                  </li>
                ))}
              </ol>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dl-template">{t("template")}</Label>
              <Input id="dl-template" value={template} onChange={(e) => setTemplate(e.target.value)} className="min-h-10 font-mono text-sm" />
              <p className="text-xs text-muted-foreground">{t("templateHint")}</p>
              <p className="rounded bg-secondary px-2 py-1 font-mono text-xs break-all">{t("example", { path: examplePath })}</p>
            </div>

            <RadioGroup value={mode} onValueChange={(v) => setMode(v as DownloadMode)} className="gap-2">
              {supportsFolderWrite() ? (
                <label className="flex items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value="folder" className="mt-1" />
                  <span>
                    <span className="block font-semibold">{t("modeFolder")}</span>
                    <span className="block text-xs text-muted-foreground">{t("modeFolderHint")}</span>
                  </span>
                </label>
              ) : null}
              <label className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="zip" className="mt-1" />
                <span>
                  <span className="block font-semibold">{t("modeZip")}</span>
                  <span className="block text-xs text-muted-foreground">{t("modeZipHint")}</span>
                </span>
              </label>
            </RadioGroup>
          </div>
        ) : stage === "preparing" ? (
          <p role="status">{t("preparing")}</p>
        ) : stage === "running" && progress ? (
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <p>{t("progress", { done: progress.done, total: progress.total, mb: mb(progress.bytes), totalMb: mb(progress.totalBytes) })}</p>
            {progress.parts > 1 ? <p className="text-sm text-muted-foreground">{t("partOf", { part: progress.part, parts: progress.parts })}</p> : null}
            <div className="h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">{progress.current}</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-2" role="status">
            <p className="font-semibold">
              {result.failed.length ? t("finishedFailed", { n: result.saved, failed: result.failed.length }) : t("finished", { n: result.saved })}
            </p>
            {result.failed.length ? (
              <ul className="max-h-40 overflow-y-auto rounded-md border p-2 font-mono text-xs">
                {result.failed.map((f) => (
                  <li key={f.path}>
                    {f.path}: {f.error}
                  </li>
                ))}
              </ul>
            ) : null}
            {result.archived ? <p className="text-sm text-muted-foreground">{t("archivedSkipped", { n: result.archived })}</p> : null}
          </div>
        ) : null}

        <DialogFooter>
          {busy ? (
            <Button variant="outline" className="min-h-11" onClick={() => abort.current?.abort()}>
              {t("cancel")}
            </Button>
          ) : (
            <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              {tc("close")}
            </Button>
          )}
          {stage === "idle" ? (
            <Button className="min-h-11" onClick={start}>
              {t("prepare")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
