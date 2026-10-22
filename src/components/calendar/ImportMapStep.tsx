"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildRows, type ImportMapping, type ParsedTable } from "@/lib/content/import-parse";
import { IMPORT_FIELDS, type ImportField } from "@/lib/content/import-template";
import { useT } from "@/lib/i18n/provider";
import { calendarImportMessages } from "@/lib/i18n/messages/calendar-import";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

const NONE = "__none__";

export type ImportOptions = { addOptions: boolean; skipDuplicates: boolean };

/** Step 2: match file columns to the 12 calendar fields, choose the options, and see what will be imported. */
export function ImportMapStep({
  parsed,
  mapping,
  onMapping,
  options,
  onOptions,
}: {
  parsed: ParsedTable;
  mapping: ImportMapping;
  onMapping: (m: ImportMapping) => void;
  options: ImportOptions;
  onOptions: (o: ImportOptions) => void;
}) {
  const t = useT(calendarImportMessages);
  const tc = useT(calendarMessages);
  const labelOf = (f: ImportField) => (f === "title" ? tc("title_col") : tc(f));
  const firstRow = parsed.table[parsed.headerIndex + 1] ?? [];
  const built = useMemo(() => buildRows(parsed, mapping), [parsed, mapping]);
  const undated = built.rows.filter((r) => !r.publish_date).length;

  function setColumn(field: ImportField, value: string) {
    const next = { ...mapping };
    const col = value === NONE ? null : Number(value);
    // a column feeds one field only
    if (col !== null) for (const f of IMPORT_FIELDS) if (next[f] === col) next[f] = null;
    next[field] = col;
    onMapping(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold">{t("mapTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("mapBody")}</p>
      </div>

      <div className="flex flex-col gap-2">
        {IMPORT_FIELDS.map((field) => {
          const col = mapping[field];
          const example = col === null ? "" : String(firstRow[col] instanceof Date ? (firstRow[col] as Date).toISOString().slice(0, 10) : (firstRow[col] ?? ""));
          return (
            <div key={field} className="grid items-center gap-2 sm:grid-cols-[10rem_minmax(0,16rem)_minmax(0,1fr)]">
              <Label className="font-medium">
                {labelOf(field)}
                {field === "title" ? <span className="text-destructive"> *</span> : null}
              </Label>
              <Select value={col === null ? NONE : String(col)} onValueChange={(v) => setColumn(field, v)}>
                <SelectTrigger className="h-10" aria-label={labelOf(field)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("notInFile")}</SelectItem>
                  {parsed.headers.map((h, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {h || `(${i + 1})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="truncate text-xs text-muted-foreground">{example ? `${t("sampleValue")}: ${example}` : ""}</p>
            </div>
          );
        })}
      </div>
      {mapping.title === null ? (
        <p role="alert" className="text-sm text-destructive">
          {t("needTitle")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={options.addOptions} onCheckedChange={(c) => onOptions({ ...options, addOptions: c === true })} className="mt-0.5" />
          {t("optAdd")}
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={options.skipDuplicates} onCheckedChange={(c) => onOptions({ ...options, skipDuplicates: c === true })} className="mt-0.5" />
          {t("optSkip")}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">{t("previewTitle")}</h3>
        <p className="text-sm" role="status">
          <span className="font-medium">{t("ready", { n: built.rows.length })}</span>
          {built.problems.length ? <span className="text-destructive"> · {t("problems", { n: built.problems.length })}</span> : null}
          {built.blank ? <span className="text-muted-foreground"> · {t("blank", { n: built.blank })}</span> : null}
        </p>
        {built.rows.length ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-2 py-1.5">{t("colDate")}</th>
                  <th className="px-2 py-1.5">{tc("platform")}</th>
                  <th className="px-2 py-1.5">{t("colTitle")}</th>
                  <th className="px-2 py-1.5">{tc("status")}</th>
                </tr>
              </thead>
              <tbody>
                {built.rows.slice(0, 5).map((r) => (
                  <tr key={r.n} className="border-t">
                    <td className="whitespace-nowrap px-2 py-1.5">{r.publish_date ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.platform ?? "—"}</td>
                    <td className="max-w-64 truncate px-2 py-1.5">{r.title}</td>
                    <td className="px-2 py-1.5">{r.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {undated ? <p className="text-sm text-amber-700 dark:text-amber-400">{t("undated", { n: undated })}</p> : null}
        {built.problems.length ? (
          <ul className="list-disc pl-5 text-sm text-destructive">
            {built.problems.slice(0, 8).map((p) => (
              <li key={p.n}>{t("rowProblem", { n: p.n, message: p.message })}</li>
            ))}
            {built.problems.length > 8 ? <li className="list-none">{t("moreProblems", { n: built.problems.length - 8 })}</li> : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
