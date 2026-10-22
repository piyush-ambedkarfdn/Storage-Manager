import { IMPORT_FIELDS, IMPORT_LIMITS, IMPORT_SYNONYMS, type ImportField } from "@/lib/content/import-template";

/**
 * Reads a sheet into rows of cells (browser only), finds the header row, matches columns to the 12 calendar
 * fields, and turns the body into import rows. Everything after readTable() is plain functions (no browser needed).
 */

export type ImportMapping = Record<ImportField, number | null>;
export type ImportRow = { n: number } & Record<ImportField, string | null>;
export type RowProblem = { n: number; message: string };
export type ParsedTable = { table: unknown[][]; headerIndex: number; headers: string[] };

export class ImportFileError extends Error {
  constructor(public code: "too_big" | "old_xls" | "unreadable" | "empty" | "too_many_rows") {
    super(code);
    this.name = "ImportFileError";
  }
}

/** Reads the first sheet of an .xlsx, or a .csv, into rows of cells. */
export async function readTable(file: File): Promise<unknown[][]> {
  if (file.size > IMPORT_LIMITS.maxBytes) throw new ImportFileError("too_big");
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) throw new ImportFileError("old_xls");
  try {
    if (file.name.toLowerCase().endsWith(".xlsx") || (head[0] === 0x50 && head[1] === 0x4b)) {
      const { readSheet } = await import("read-excel-file/browser");
      return (await readSheet(file)) as unknown[][];
    }
    const Papa = (await import("papaparse")).default;
    return Papa.parse<string[]>(await file.text(), { skipEmptyLines: true }).data;
  } catch {
    throw new ImportFileError("unreadable");
  }
}

const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .trim();

/** Matches headers to fields: exact name first, then known synonyms. A column is used for one field only. */
export function autoMap(headers: unknown[]): ImportMapping {
  const normalised = headers.map(norm);
  const mapping = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, null])) as ImportMapping;
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    const names = IMPORT_SYNONYMS[field];
    for (const name of names) {
      const i = normalised.findIndex((h, idx) => h === name && !used.has(idx));
      if (i >= 0) {
        mapping[field] = i;
        used.add(i);
        break;
      }
    }
  }
  return mapping;
}

/** The header row is the one (of the first 10) that matches the most fields. */
export function findHeader(table: unknown[][]): ParsedTable {
  if (!table.length) throw new ImportFileError("empty");
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(table.length, 10); i++) {
    const score = Object.values(autoMap(table[i] ?? [])).filter((x) => x !== null).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  const headers = (table[best] ?? []).map((h) => String(h ?? "").trim());
  if (table.length - best - 1 > IMPORT_LIMITS.maxRows + 500) throw new ImportFileError("too_many_rows");
  return { table, headerIndex: best, headers };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Dates: real Excel dates (read as UTC midnight), yyyy-mm-dd, dd/mm/yyyy (day first, as in India),
 * "26 Nov 2026" and "Nov 26, 2026". Returns null for an empty cell, undefined when the text is not a date.
 */
export function parseDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : iso(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) ?? undefined;
  if (typeof value === "number") {
    // an Excel serial number (days since 1899-12-30)
    if (value > 20000 && value < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) ?? undefined;
    }
    return undefined;
  }
  const s = String(value).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) return iso(+m[1], +m[2], +m[3]) ?? undefined;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) ?? undefined;
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mi >= 0 ? iso(+m[3], mi + 1, +m[1]) ?? undefined : undefined;
  }
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mi >= 0 ? iso(+m[3], mi + 1, +m[2]) ?? undefined : undefined;
  }
  return undefined;
}

const LIMITS: Record<Exclude<ImportField, "publish_date">, number> = {
  platform: 80,
  content_format: 80,
  content_pillar: 80,
  title: 200,
  content_brief: 4000,
  caption: 5000,
  hashtags: 1000,
  cta: 300,
  goal: 80,
  status: 80,
  production_stage: 80,
};

const cellText = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).trim();

/**
 * Turns the body rows into import rows using the chosen mapping. Empty rows are dropped. Rows that cannot be
 * imported (no title, a date we cannot read, a text over its length limit) are returned in `problems` and left out of `rows`.
 * Option values (platform, format…) are made to agree in capital letters with the first spelling seen in the file.
 */
export function buildRows(parsed: ParsedTable, mapping: ImportMapping): { rows: ImportRow[]; problems: RowProblem[]; blank: number } {
  const rows: ImportRow[] = [];
  const problems: RowProblem[] = [];
  let blank = 0;
  const seen = new Map<string, string>(); // "field|lowercase" -> first spelling

  for (let i = parsed.headerIndex + 1; i < parsed.table.length; i++) {
    const cells = parsed.table[i] ?? [];
    const n = i + 1; // the row number as Excel shows it
    const get = (f: ImportField) => (mapping[f] === null ? undefined : cells[mapping[f]!]);
    if (IMPORT_FIELDS.every((f) => !cellText(get(f)))) {
      blank++;
      continue;
    }
    const row = { n } as ImportRow;
    let problem: string | null = null;

    const date = parseDate(get("publish_date"));
    if (date === undefined) problem = `date “${cellText(get("publish_date"))}” is not a date`;
    row.publish_date = date ?? null;

    for (const f of IMPORT_FIELDS) {
      if (f === "publish_date") continue;
      let text = cellText(get(f));
      if (text && ["platform", "content_format", "content_pillar", "goal", "status", "production_stage"].includes(f)) {
        const key = `${f}|${text.toLowerCase()}`;
        text = seen.get(key) ?? text;
        seen.set(key, text);
      }
      if (text.length > LIMITS[f]) problem ??= `${f.replace("_", " ")} is longer than ${LIMITS[f]} characters`;
      row[f] = text || null;
    }
    if (!row.title) problem ??= "no Topic/Title";
    if (problem) problems.push({ n, message: problem });
    else rows.push(row);
  }
  return { rows, problems, blank };
}
