"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportMapStep, type ImportOptions } from "@/components/calendar/ImportMapStep";
import { requestJson } from "@/hooks/useOptions";
import { autoMap, buildRows, findHeader, ImportFileError, readTable, type ImportMapping, type ParsedTable } from "@/lib/content/import-parse";
import { IMPORT_ACCEPT, SAMPLE_FILE_NAME, SAMPLE_FILE_URL } from "@/lib/content/import-template";
import { useT } from "@/lib/i18n/provider";
import { calendarImportMessages } from "@/lib/i18n/messages/calendar-import";
import type { ImportRecord, ImportResult } from "@/types/content-import";

type Stage = "choose" | "reading" | "map" | "saving" | "done";

/**
 * Import posts from Excel/CSV: choose a file, match columns, import. The browser reads the sheet; the server
 * keeps the original file in the active storage and saves the posts in the database in one go.
 */
export function ImportDialog({
  open,
  onOpenChange,
  onDone,
  onShowMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  onShowMonth: (month: string) => void;
}) {
  const t = useT(calendarImportMessages);
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
  const [options, setOptions] = useState<ImportOptions>({ addOptions: true, skipDuplicates: true });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ r: ImportResult; firstMonth: string | null } | null>(null);

  const past = useQuery({
    queryKey: ["content-imports"],
    queryFn: () => requestJson<{ imports: ImportRecord[] }>("/api/content/import").then((r) => r.imports),
    enabled: open && stage === "choose",
  });

  function reset() {
    setStage("choose");
    setFile(null);
    setParsed(null);
    setMapping(null);
    setError(null);
    setResult(null);
  }

  function close(next: boolean) {
    if (stage === "saving") return;
    onOpenChange(next);
    if (!next) setTimeout(reset, 200);
  }

  async function onFile(f: File) {
    setError(null);
    setStage("reading");
    try {
      const table = await readTable(f);
      const p = findHeader(table);
      setFile(f);
      setParsed(p);
      setMapping(autoMap(p.headers));
      setStage("map");
    } catch (err) {
      setError(err instanceof ImportFileError ? t(`err_${err.code}` as `err_${ImportFileError["code"]}`) : t("err_unreadable"));
      setStage("choose");
    }
  }

  async function save() {
    if (!file || !parsed || !mapping) return;
    const { rows } = buildRows(parsed, mapping);
    if (!rows.length) return;
    setStage("saving");
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("payload", JSON.stringify({ rows, ...options }));
      const res = await fetch("/api/content/import", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { result?: ImportResult; error?: string };
      if (!res.ok || !body.result) throw new Error(body.error ?? t("failed"));
      const firstDate = rows.map((r) => r.publish_date).filter((d): d is string => !!d).sort()[0] ?? null;
      setResult({ r: body.result, firstMonth: firstDate ? firstDate.slice(0, 7) : null });
      setStage("done");
      onDone();
      void qc.invalidateQueries({ queryKey: ["content-summary"] });
      void qc.invalidateQueries({ queryKey: ["content-imports"] });
      if (body.result.options_added) void qc.invalidateQueries({ queryKey: ["options"] });
      toast.success(t("doneAdded", { n: body.result.imported }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setStage("map");
    }
  }

  const readyCount = parsed && mapping ? buildRows(parsed, mapping).rows.length : 0;
  const canImport = mapping?.title !== null && readyCount > 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stage === "done" ? t("doneTitle") : t("title")}</DialogTitle>
          <DialogDescription>{stage === "choose" || stage === "reading" ? t("chooseBody") : (file?.name ?? "")}</DialogDescription>
        </DialogHeader>

        {stage === "choose" || stage === "reading" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <FileUp className="size-4" aria-hidden /> {t("chooseFile")}
                <input
                  type="file"
                  accept={IMPORT_ACCEPT}
                  className="sr-only"
                  disabled={stage === "reading"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button asChild variant="outline" className="min-h-10">
                <a href={SAMPLE_FILE_URL} download={SAMPLE_FILE_NAME}>
                  <FileSpreadsheet aria-hidden /> {t("sampleLink")}
                </a>
              </Button>
              {stage === "reading" ? <span className="text-sm text-muted-foreground">{t("reading")}</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">{t("limits")}</p>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}

            <div>
              <h3 className="mb-1 text-sm font-semibold">{t("pastImports")}</h3>
              {past.data?.length ? (
                <ul className="divide-y rounded-md border text-sm">
                  {past.data.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(i.created_at).toLocaleDateString()} · {t("pastLine", { imported: i.rows_imported, skipped: i.rows_skipped })}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="icon" className="size-9" aria-label={t("download")}>
                        <a href={`/api/content/import/${i.id}`}>
                          <Download aria-hidden />
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{past.isLoading ? "…" : t("noPast")}</p>
              )}
            </div>
          </div>
        ) : null}

        {(stage === "map" || stage === "saving") && parsed && mapping ? (
          <>
            <ImportMapStep parsed={parsed} mapping={mapping} onMapping={setMapping} options={options} onOptions={setOptions} />
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="outline" className="min-h-10" disabled={stage === "saving"} onClick={reset}>
                {t("back")}
              </Button>
              <Button className="min-h-10" disabled={!canImport || stage === "saving"} onClick={() => void save()}>
                {stage === "saving" ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> {t("importing")}
                  </>
                ) : (
                  t("importNow", { n: readyCount })
                )}
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {stage === "done" && result ? (
          <>
            <div className="flex flex-col gap-1 text-sm" role="status">
              <p className="font-medium">{t("doneAdded", { n: result.r.imported })}</p>
              {result.r.skipped ? <p>{t("doneSkipped", { n: result.r.skipped })}</p> : null}
              {result.r.options_added ? <p>{t("doneOptions", { n: result.r.options_added })}</p> : null}
              <p className="text-muted-foreground">{t("doneFile")}</p>
            </div>
            <DialogFooter className="gap-2">
              {result.firstMonth ? (
                <Button
                  variant="outline"
                  className="min-h-10"
                  onClick={() => {
                    onShowMonth(result.firstMonth!);
                    close(false);
                  }}
                >
                  {t("showMonth")}
                </Button>
              ) : null}
              <Button className="min-h-10" onClick={() => close(false)}>
                {t("close")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
