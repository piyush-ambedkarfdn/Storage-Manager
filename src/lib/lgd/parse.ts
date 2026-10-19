import {
  LGD_FIELD_LABELS,
  type LgdDistrictSummary,
  type LgdField,
  type LgdFileInfo,
  type LgdFileKind,
  type LgdJoinNotes,
  type LgdParseResult,
  type LgdRow,
} from "@/lib/lgd/types";

/**
 * LGD files are read in the browser (a whole state is tens of MB); only the chosen districts are sent.
 *
 * Files LGD gives you ("Download All Entities of State"):
 *  - villageGramPanchayatMapping…xls  (Village To Gram Panchayat Mapping): village → gram panchayat, no block
 *  - allBlockStateWithCoveredVillage…xls (All Development Blocks of State With Covered Village): village → block
 * Both are "XML Spreadsheet 2003" files named .xls. Choose both: they are joined by village code.
 * A single CSV/.xlsx that already has all eight columns also works.
 */

export class LgdFormatError extends Error {
  constructor(
    public code: "missing_columns" | "need_blocks" | "need_panchayats" | "block_list_only" | "old_xls" | "unreadable",
    public missing: string[] = [],
    public fileName = "",
  ) {
    super(code);
    this.name = "LgdFormatError";
  }
}

// ---------- column recognition ----------

type Rule = { all: string[]; any?: string[]; not?: string[] };

const COLUMN_RULES: Record<LgdField, Rule> = {
  dc: { all: ["district", "code"], not: ["sub", "subdistrict", "census", "local language"] },
  dn: { all: ["district", "name"], not: ["sub", "subdistrict", "local language", "in local"] },
  bc: { all: ["code"], any: ["block", "development"], not: ["local language", "version"] },
  bn: { all: ["name"], any: ["block", "development"], not: ["local language", "in local"] },
  pc: { all: ["code"], any: ["panchayat", "local body", "gp", "lb"], not: ["village", "local language", "district", "block", "type"] },
  pn: { all: ["name"], any: ["panchayat", "local body", "gp", "lb"], not: ["village", "local language", "in local", "district", "block", "type"] },
  vc: { all: ["village", "code"], not: ["census", "local language"] },
  vn: { all: ["village", "name"], not: ["local language", "in local"] },
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

function mapColumns(headerRow: unknown[]): Partial<Record<LgdField, number>> {
  const headers = headerRow.map(norm);
  const out: Partial<Record<LgdField, number>> = {};
  (Object.keys(COLUMN_RULES) as LgdField[]).forEach((field) => {
    const hits = headers.map((h, i) => (matches(h, COLUMN_RULES[field]) ? i : -1)).filter((i) => i >= 0);
    if (!hits.length) return;
    out[field] = hits.find((i) => has(headers[i], "english")) ?? hits[0];
  });
  return out;
}

function classify(cols: Partial<Record<LgdField, number>>): LgdFileKind {
  const hasAll = (fs: LgdField[]) => fs.every((f) => cols[f] !== undefined);
  if (hasAll(["dc", "dn", "bc", "bn", "pc", "pn", "vc", "vn"])) return "combined";
  if (hasAll(["dc", "dn", "pc", "pn", "vc", "vn"])) return "gpMap";
  if (hasAll(["dc", "bc", "bn", "vc"])) return "blockVillages";
  if (hasAll(["dc", "bc", "bn"])) return "blockList";
  return "unknown";
}

// ---------- reading files ----------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "") // formatting tags inside rich text cells
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e.toLowerCase()] ?? m;
    });
}

/**
 * "XML Spreadsheet 2003" (what LGD calls .xls): rows of cells with optional ss:Index (skipped cells)
 * and ss:MergeAcross. Read with simple scanning so a 50 MB file does not need a full XML DOM.
 */
export function parseSpreadsheetXml(text: string): string[][] {
  const rows: string[][] = [];
  const rowRe = /<(?:ss:)?Row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:ss:)?Row>)/g;
  const cellRe = /<(?:ss:)?Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:ss:)?Cell>)/g;
  const dataRe = /<(?:ss:)?Data\b[^>]*>([\s\S]*?)<\/(?:ss:)?Data>/;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(text))) {
    const cells: string[] = [];
    const body = row[1] ?? "";
    let cell: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cell = cellRe.exec(body))) {
      const attrs = cell[1] ?? "";
      const index = /ss:Index="(\d+)"/.exec(attrs);
      if (index) while (cells.length < Number(index[1]) - 1) cells.push("");
      const data = cell[2] ? dataRe.exec(cell[2]) : null;
      cells.push(data ? decode(data[1]).trim() : "");
      const merge = /ss:MergeAcross="(\d+)"/.exec(attrs);
      if (merge) for (let i = 0; i < Number(merge[1]); i++) cells.push("");
    }
    rows.push(cells);
  }
  return rows;
}

/** Reads a CSV, .xlsx, or LGD's XML .xls into rows of cells (browser only). */
export async function readLgdTable(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) {
    throw new LgdFormatError("old_xls", [], file.name); // real binary Excel 97 file
  }
  if (name.endsWith(".xlsx") || (head[0] === 0x50 && head[1] === 0x4b)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  const text = await file.text();
  if (/^\s*<\?xml/.test(text) || text.includes("urn:schemas-microsoft-com:office:spreadsheet")) {
    return parseSpreadsheetXml(text);
  }
  const Papa = (await import("papaparse")).default;
  return Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
}

// ---------- turning tables into village rows ----------

const digits = (v: unknown) => {
  const s = String(v ?? "").trim().replace(/\.0+$/, "");
  return /^\d+$/.test(s) ? s : "";
};
const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

type ReadTable = { info: LgdFileInfo; cols: Partial<Record<LgdField, number>>; body: unknown[][] };

function inspect(name: string, table: unknown[][]): ReadTable {
  let best: Partial<Record<LgdField, number>> = {};
  let headerIndex = -1;
  for (let i = 0; i < Math.min(table.length, 20); i++) {
    const c = mapColumns(table[i] ?? []);
    if (Object.keys(c).length > Object.keys(best).length) {
      best = c;
      headerIndex = i;
    }
  }
  const header = headerIndex >= 0 ? table[headerIndex] : [];
  const columns = Object.fromEntries((Object.keys(best) as LgdField[]).map((f) => [f, text(header[best[f]!])])) as LgdFileInfo["columns"];
  const body = headerIndex >= 0 ? table.slice(headerIndex + 1) : [];
  const kind = classify(best);
  const vcol = best.vc ?? best.bc;
  const rows = vcol === undefined ? 0 : body.filter((r) => digits(r[vcol])).length;
  return { info: { name, kind, rows, columns }, cols: best, body };
}

function summarise(rows: LgdRow[]): LgdDistrictSummary[] {
  const map = new Map<string, LgdDistrictSummary>();
  for (const r of rows) {
    const d = map.get(r.dc) ?? { code: r.dc, name: r.dn, villages: 0 };
    d.villages += 1;
    map.set(r.dc, d);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One combined file, or the gram-panchayat mapping plus the blocks-with-villages file joined by village code.
 * Villages with no panchayat are left out; a village missing from the block file takes the block of the
 * other villages of its panchayat (in LGD a gram panchayat never spans two blocks).
 */
export function mapLgdTables(files: { name: string; table: unknown[][] }[]): LgdParseResult {
  const read = files.map((f) => inspect(f.name, f.table));
  const infos = read.map((r) => r.info);
  const notes: LgdJoinNotes = { noPanchayat: 0, blockFromPanchayat: 0, noBlock: 0 };
  const get = (t: ReadTable, line: unknown[], f: LgdField) => {
    const i = t.cols[f];
    return i === undefined ? "" : f.endsWith("c") ? digits(line[i]) : text(line[i]);
  };

  const combined = read.find((r) => r.info.kind === "combined");
  if (combined) {
    const rows: LgdRow[] = [];
    for (const line of combined.body) {
      const row = Object.fromEntries((Object.keys(LGD_FIELD_LABELS) as LgdField[]).map((f) => [f, get(combined, line, f)])) as LgdRow;
      if (!row.dc && !row.vc) continue;
      rows.push(row);
    }
    return { rows, files: infos, districts: summarise(rows), notes };
  }

  const gp = read.find((r) => r.info.kind === "gpMap");
  const bv = read.find((r) => r.info.kind === "blockVillages");
  if (gp && bv) {
    const villageBlock = new Map<string, { bc: string; bn: string }>();
    for (const line of bv.body) {
      const vc = get(bv, line, "vc");
      const bc = get(bv, line, "bc");
      if (vc && bc) villageBlock.set(vc, { bc, bn: get(bv, line, "bn") });
    }
    const gpLines = gp.body.filter((line) => get(gp, line, "vc"));
    const panchayatBlock = new Map<string, { bc: string; bn: string }>();
    for (const line of gpLines) {
      const pc = get(gp, line, "pc");
      const b = villageBlock.get(get(gp, line, "vc"));
      if (pc && b && !panchayatBlock.has(pc)) panchayatBlock.set(pc, b);
    }
    const rows: LgdRow[] = [];
    for (const line of gpLines) {
      const vc = get(gp, line, "vc");
      const pc = get(gp, line, "pc");
      if (!pc) {
        notes.noPanchayat++;
        continue;
      }
      let block = villageBlock.get(vc);
      if (!block) {
        block = panchayatBlock.get(pc);
        if (block) notes.blockFromPanchayat++;
      }
      if (!block) {
        notes.noBlock++;
        continue;
      }
      rows.push({
        dc: get(gp, line, "dc"),
        dn: get(gp, line, "dn"),
        bc: block.bc,
        bn: block.bn,
        pc,
        pn: get(gp, line, "pn"),
        vc,
        vn: get(gp, line, "vn"),
      });
    }
    return { rows, files: infos, districts: summarise(rows), notes };
  }

  if (gp) throw new LgdFormatError("need_blocks", [], gp.info.name);
  if (bv) throw new LgdFormatError("need_panchayats", [], bv.info.name);
  const list = read.find((r) => r.info.kind === "blockList");
  if (list) throw new LgdFormatError("block_list_only", [], list.info.name);
  const bestGuess = read[0];
  const missing = (Object.keys(LGD_FIELD_LABELS) as LgdField[]).filter((f) => bestGuess?.cols[f] === undefined).map((f) => LGD_FIELD_LABELS[f]);
  throw new LgdFormatError("missing_columns", missing, bestGuess?.info.name ?? "");
}

/** Reads and maps several files at once (the files the admin chose together). */
export async function readLgdFiles(files: File[]): Promise<LgdParseResult> {
  const tables = [];
  for (const f of files) tables.push({ name: f.name, table: await readLgdTable(f) });
  return mapLgdTables(tables);
}
