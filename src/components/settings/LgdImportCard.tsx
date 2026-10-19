"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { requestJson } from "@/hooks/useOptions";
import { useInvalidatePlaces, usePlaces } from "@/hooks/usePlaces";
import { LgdFormatError, mapLgdTable, readLgdTable } from "@/lib/lgd/parse";
import { LGD_MAX_ROWS } from "@/lib/schemas/places";
import type { LgdLevelCounts, LgdParseResult, LgdResult } from "@/lib/lgd/types";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";

type Stage = "idle" | "reading" | "parsed" | "working" | "previewed" | "done";
const LEVELS = ["districts", "blocks", "panchayats", "villages"] as const;
const ZERO: LgdLevelCounts = { total: 0, new: 0, adopted: 0, already: 0, renamed: 0, moved: 0, orphans: 0 };

function addResults(a: LgdResult | null, b: LgdResult): LgdResult {
  if (!a) return b;
  const sum = (x: LgdLevelCounts, y: LgdLevelCounts): LgdLevelCounts =>
    Object.fromEntries(Object.keys(ZERO).map((k) => [k, x[k as keyof LgdLevelCounts] + y[k as keyof LgdLevelCounts]])) as LgdLevelCounts;
  return {
    districts: sum(a.districts, b.districts),
    blocks: sum(a.blocks, b.blocks),
    panchayats: sum(a.panchayats, b.panchayats),
    villages: sum(a.villages, b.villages),
    skipped_rows: a.skipped_rows + b.skipped_rows,
    multi_panchayat_villages: a.multi_panchayat_villages + b.multi_panchayat_villages,
    committed: b.committed,
  };
}

/**
 * LGD import: read the file in the browser, tick districts, preview (nothing saved), import.
 * Each district is sent as its own request so every database call stays short.
 */
export function LgdImportCard() {
  const t = useT(settingsMessages);
  const invalidate = useInvalidatePlaces();
  const existing = usePlaces("district", { limit: 1000 });
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<{ message: string; missing: string[] } | null>(null);
  const [parsed, setParsed] = useState<LgdParseResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<LgdResult | null>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setStage("reading");
    try {
      const p = mapLgdTable(await readLgdTable(file));
      const known = new Set((existing.data?.items ?? []).map((d) => d.name.trim().toLowerCase()));
      setParsed(p);
      setPicked(new Set(p.districts.filter((d) => known.has(d.name.toLowerCase())).map((d) => d.code)));
      setStage("parsed");
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : String(err),
        missing: err instanceof LgdFormatError ? err.missing : [],
      });
      setStage("idle");
    }
  }

  async function run(commit: boolean) {
    if (!parsed) return;
    const chosen = parsed.districts.filter((d) => picked.has(d.code));
    if (!chosen.length) {
      toast.error(t("lgdPickDistrict"));
      return;
    }
    setStage("working");
    let total: LgdResult | null = null;
    try {
      for (const d of chosen) {
        setProgress(t(commit ? "lgdImporting" : "lgdPreviewing", { name: d.name }));
        const rows = parsed.rows.filter((r) => r.dc === d.code);
        for (let i = 0; i < rows.length; i += LGD_MAX_ROWS) {
          const { result: r } = await requestJson<{ result: LgdResult }>(
            `/api/places/import-lgd/${commit ? "commit" : "preview"}`,
            { method: "POST", body: { rows: rows.slice(i, i + LGD_MAX_ROWS) } },
          );
          total = addResults(total, r);
        }
      }
      setResult(total);
      setStage(commit ? "done" : "previewed");
      if (commit && total) {
        toast.success(
          t("lgdDone", {
            villages: total.villages.new,
            adopted: total.districts.adopted + total.blocks.adopted + total.panchayats.adopted + total.villages.adopted,
          }),
        );
        await invalidate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setStage(result ? "previewed" : "parsed");
    } finally {
      setProgress("");
    }
  }

  const orphans = result ? LEVELS.reduce((n, l) => n + result[l].orphans, 0) : 0;

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{t("lgdTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("lgdBody")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
          <FileUp className="size-4" aria-hidden /> {stage === "idle" ? t("lgdChoose") : t("lgdStartOver")}
          <input
            type="file"
            accept=".csv,.xlsx,text/csv"
            className="sr-only"
            disabled={stage === "reading" || stage === "working"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {stage === "reading" ? <span className="text-sm text-muted-foreground">{t("lgdReading")}</span> : null}
        {progress ? (
          <span role="status" className="text-sm text-muted-foreground">
            {progress}
          </span>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <p>{error.message}</p>
          {error.missing.length ? (
            <ul className="mt-1 list-disc pl-5">
              {error.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {parsed ? (
        <>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">{t("lgdColumns")}</summary>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
              {Object.entries(parsed.columns).map(([k, v]) => (
                <li key={k}>
                  <code className="text-xs">{k}</code> ← {v}
                </li>
              ))}
            </ul>
          </details>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("lgdDistricts")}</legend>
            <div className="flex max-h-56 flex-wrap gap-x-5 gap-y-2 overflow-y-auto rounded-md border p-3">
              {parsed.districts.map((d) => (
                <label key={d.code} className="flex min-h-8 items-center gap-2 text-sm">
                  <Checkbox
                    checked={picked.has(d.code)}
                    disabled={stage === "working"}
                    onCheckedChange={(c) => {
                      const next = new Set(picked);
                      if (c) next.add(d.code);
                      else next.delete(d.code);
                      setPicked(next);
                      setResult(null);
                      if (stage !== "working") setStage("parsed");
                    }}
                  />
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted-foreground">{t("lgdVillagesIn", { n: d.villages })}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" disabled={stage === "working" || picked.size === 0} onClick={() => run(false)}>
              {t("lgdPreview")}
            </Button>
            <Button className="min-h-11" disabled={stage !== "previewed" || picked.size === 0} onClick={() => run(true)}>
              {t("lgdImport", { n: picked.size })}
            </Button>
          </div>
        </>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2">
          {!result.committed ? <p className="text-sm font-semibold">{t("lgdPreviewNote")}</p> : null}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">{t("lgdLevel")}</th>
                  <th className="px-3 py-2 text-right">{t("lgdNew")}</th>
                  <th className="px-3 py-2 text-right">{t("lgdAlready")}</th>
                  <th className="px-3 py-2 text-right">{t("lgdAdopted")}</th>
                  <th className="px-3 py-2 text-right">{t("lgdRenamed")}</th>
                  <th className="px-3 py-2 text-right">{t("lgdMoved")}</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((l) => (
                  <tr key={l} className="border-t tabular-nums">
                    <th scope="row" className="px-3 py-1.5 text-left font-semibold">
                      {t(l as SettingsKey)}
                    </th>
                    <td className="px-3 py-1.5 text-right">{result[l].new}</td>
                    <td className="px-3 py-1.5 text-right">{result[l].already}</td>
                    <td className="px-3 py-1.5 text-right">{result[l].adopted}</td>
                    <td className="px-3 py-1.5 text-right">{result[l].renamed}</td>
                    <td className="px-3 py-1.5 text-right">{result[l].moved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.skipped_rows ? <p className="text-sm text-muted-foreground">{t("lgdSkipped", { n: result.skipped_rows })}</p> : null}
          {result.multi_panchayat_villages ? (
            <p className="text-sm text-marigold-ink">{t("lgdMulti", { n: result.multi_panchayat_villages })}</p>
          ) : null}
          {orphans ? <p className="text-sm text-marigold-ink">{t("lgdOrphans", { n: orphans })}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
