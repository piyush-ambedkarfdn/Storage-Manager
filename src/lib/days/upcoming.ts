import type { AwarenessDay, CustomDay, UpcomingDay } from "@/types/days";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

function exists(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCMonth() === m - 1;
}

/**
 * Every built-in and custom day that falls between from and to (inclusive), sorted by date.
 * Yearly days repeat each year in the range; a custom day with a year only counts that year.
 * 29 February appears only in leap years. Hidden built-in days are marked (and left out unless asked).
 */
export function upcomingDays(
  from: string,
  to: string,
  builtins: readonly AwarenessDay[],
  customs: CustomDay[],
  hiddenIds: string[],
  opts: { includeHidden?: boolean } = {},
): UpcomingDay[] {
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  const hidden = new Set(hiddenIds);
  const out: UpcomingDay[] = [];

  for (let y = startYear; y <= endYear; y++) {
    for (const b of builtins) {
      if (!exists(y, b.month, b.day)) continue;
      const date = `${y}-${pad(b.month)}-${pad(b.day)}`;
      if (date < from || date > to) continue;
      const isHidden = hidden.has(b.id);
      if (isHidden && !opts.includeHidden) continue;
      out.push({ key: `builtin:${b.id}`, date, name: b.name, nameHi: b.nameHi, scope: b.scope, tags: b.tags, source: "builtin", hidden: isHidden, custom: null });
    }
    for (const c of customs) {
      if (c.year && c.year !== y) continue;
      if (!exists(y, c.month, c.day)) continue;
      const date = `${y}-${pad(c.month)}-${pad(c.day)}`;
      if (date < from || date > to) continue;
      out.push({ key: `custom:${c.id}`, date, name: c.name, nameHi: c.name_hi, scope: c.scope, tags: c.tags, source: "custom", hidden: false, custom: c });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
