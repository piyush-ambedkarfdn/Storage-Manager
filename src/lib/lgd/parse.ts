import type { LgdDistrictSummary, LgdField, LgdParseResult, LgdRow } from "@/lib/lgd/types";
import { LGD_FIELD_LABELS } from "@/lib/lgd/types";

/**
 * LGD file reading, in the browser. Files can be large (a whole state), so they are parsed here and only
 * the chosen districts are sent to the server, one district per request.
 * Column titles differ between LGD downloads; every rule for recognising them lives in COLUMN_RULES.
 */

type Rule = { all: string[]; any?: string[]; not?: string[] };

const COLUMN_RULES: Record<LgdField, Rule> = {
  dc: { all: ["district", "code"], not: ["sub", "local language"] },
  dn: { all: ["district", "name"], not: ["sub", "local language"] },
  bc: { all: ["code"], any: ["block", "development"], not: ["local language"] },
  bn: { all: ["name"], any: ["block", "development"], not: ["local language"] },
  pc: { all: ["code"], any: ["panchayat", "local body", "gp", "lb"], not: ["village", "local language", "district", "block", "type"] },
  pn: { all: ["name"], any: ["panchayat", "local body", "gp", "lb"], not: ["village", "local language", "district", "block", "type"] },
  vc: { all: ["village", "code"], not: ["local language"] },
  vn: { all: ["village", "name"], not: ["local language"] },
};

const norm = (h: unknown) =>
  ` ${String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

/** Whole-word (or whole-phrase) match inside a normalised, space-padded header. */
const has = (h: string, word: string) => h.includes(` ${word} `);

function matches(header: string, rule: Rule): boolean {
  if (!rule.all.every((w) => has(header, w))) return false;
  if (rule.any && !rule.any.some((w) => has(header, w))) return false;
  if (rule.not && rule.not.some((w) => has(header, w))) return false;
  return true;
}

/** Picks the column for each field; for names, an "(In English)" column wins over others. */
function mapColumns(headerRow: unknown[]): Partial<Record<LgdField, number>> {
  const headers = headerRow.map(norm);
  const out: Partial<Record<LgdField, number>> = {};
  (Object.keys(COLUMN_RULES) as LgdField[]).forEach((field) => {
    const hits = headers.map((h, i) => (matches(h, COLUMN_RULES[field]) ? i : -1)).filter((i) => i >= 0);
    if (!hits.length) return;
    const english = hits.find((i) => has(headers[i], "english"));
    out[field] = english ?? hits[0];
  });
  return out;
}

export class LgdFormatError extends Error {
  constructor(
    message: string,
    public missing: string[] = [],
  ) {
    super(message);
    this.name = "LgdFormatError";
  }
}

/** Reads a CSV or .xlsx file into rows of cells (browser only). */
export async function readLgdTable(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  if (name.endsWith(".xls")) {
    throw new LgdFormatError("Old .xls files cannot be read. Open the file and save it as .xlsx or .csv, then try again.");
  }
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return parsed.data;
}

const digits = (v: unknown) => {
  const s = String(v ?? "").trim().replace(/\.0+$/, "");
  return /^\d+$/.test(s) ? s : "";
};
const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Finds the header row (LGD files sometimes start with a title line) and maps every village row. */
export function mapLgdTable(table: unknown[][]): LgdParseResult {
  let headerIndex = -1;
  let cols: Partial<Record<LgdField, number>> = {};
  for (let i = 0; i < Math.min(table.length, 15); i++) {
    const c = mapColumns(table[i] ?? []);
    if (Object.keys(c).length > Object.keys(cols).length) {
      cols = c;
      headerIndex = i;
    }
    if (Object.keys(c).length === 8) break;
  }
  const missing = (Object.keys(LGD_FIELD_LABELS) as LgdField[]).filter((f) => cols[f] === undefined);
  if (headerIndex < 0 || missing.length) {
    throw new LgdFormatError(
      "This file does not look like the LGD village–panchayat–block mapping. These columns were not found:",
      missing.map((f) => LGD_FIELD_LABELS[f]),
    );
  }
  const header = table[headerIndex];
  const columns = Object.fromEntries(
    (Object.keys(cols) as LgdField[]).map((f) => [f, text(header[cols[f]!])]),
  ) as Record<LgdField, string>;

  const rows: LgdRow[] = [];
  const districts = new Map<string, LgdDistrictSummary>();
  for (const line of table.slice(headerIndex + 1)) {
    const get = (f: LgdField) => line[cols[f]!];
    const row: LgdRow = {
      dc: digits(get("dc")), dn: text(get("dn")),
      bc: digits(get("bc")), bn: text(get("bn")),
      pc: digits(get("pc")), pn: text(get("pn")),
      vc: digits(get("vc")), vn: text(get("vn")),
    };
    if (!row.dc && !row.vc) continue;
    rows.push(row);
    const d = districts.get(row.dc) ?? { code: row.dc, name: row.dn, villages: 0 };
    d.villages += 1;
    districts.set(row.dc, d);
  }
  return {
    rows,
    columns,
    districts: [...districts.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
