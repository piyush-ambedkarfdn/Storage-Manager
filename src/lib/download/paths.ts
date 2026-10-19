import type { DownloadLevel } from "@/types/gallery";

/**
 * Safe folder and file names on Windows, macOS, Android and in ZIP files. Devanagari is kept.
 * Empty values become "Unknown"; paths are capped so Windows (260 characters) can open them.
 */
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export function safeSegment(value: string | null | undefined, max = 60): string {
  let s = (value ?? "").normalize("NFC").replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/[. ]+$/g, ""); // Windows refuses trailing dots and spaces
  if (!s) s = "Unknown";
  if (RESERVED.test(s)) s = `${s}_`;
  return [...s].slice(0, max).join("").trim() || "Unknown";
}

export type PathValues = {
  program: string | null;
  district: string | null;
  block: string | null;
  panchayat: string | null;
  village: string | null;
  activity: string | null;
  date: string | null; // YYYY-MM-DD
  id: string;
};

export function folderFor(levels: DownloadLevel[], v: PathValues): string[] {
  return levels.map((l) => (l === "month" ? safeSegment(v.date ? v.date.slice(0, 7) : null) : safeSegment(v[l])));
}

/** {date}_{village}_{activity}_{seq} → "2026-10-14_Village-1_training_001.jpg" */
export function fileNameFor(template: string, v: PathValues, seq: number): string {
  const clean = (x: string | null) => (x && x.trim() ? safeSegment(x).replace(/\s+/g, "-") : "");
  const values: Record<string, string> = {
    date: v.date ?? "undated",
    program: clean(v.program),
    district: clean(v.district),
    block: clean(v.block),
    panchayat: clean(v.panchayat),
    village: clean(v.village),
    activity: clean(v.activity),
    id: v.id.slice(0, 8),
    seq: String(seq).padStart(3, "0"),
  };
  const name = template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "").replace(/_{2,}/g, "_");
  return `${safeSegment(name, 120)}.jpg`;
}

/** Keeps every path unique ("name.jpg", "name (2).jpg") and under the length cap. */
export function uniquePaths() {
  const used = new Set<string>();
  return (folders: string[], file: string): string => {
    const dir = folders.join("/");
    const stem = file.replace(/\.jpg$/, "");
    for (let n = 1; ; n++) {
      const name = n === 1 ? `${stem}.jpg` : `${stem} (${n}).jpg`;
      let path = dir ? `${dir}/${name}` : name;
      if (path.length > 240) path = path.slice(path.length - 240);
      if (!used.has(path.toLowerCase())) {
        used.add(path.toLowerCase());
        return path;
      }
    }
  };
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
