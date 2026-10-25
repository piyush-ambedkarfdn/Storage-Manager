import type { MyPhoto } from "@/types/my-photos";

export const NONE = "__none__";

export type MyPhotoFilters = {
  from: string; // yyyy-mm-dd or ""
  to: string;
  program: string | null; // program id
  activity: string | null; // activity label, or NONE for photos without one
  village: string | null; // village id, or NONE
};
export const NO_FILTERS: MyPhotoFilters = { from: "", to: "", program: null, activity: null, village: null };

export function hasFilters(f: MyPhotoFilters): boolean {
  return Boolean(f.from || f.to || f.program || f.activity || f.village);
}

export function filterPhotos(photos: MyPhoto[], f: MyPhotoFilters): MyPhoto[] {
  return photos.filter((p) => {
    if (f.from && (!p.event_date || p.event_date < f.from)) return false;
    if (f.to && (!p.event_date || p.event_date > f.to)) return false;
    if (f.program && p.program_id !== f.program) return false;
    if (f.activity && (f.activity === NONE ? p.activity !== null : p.activity !== f.activity)) return false;
    if (f.village && (f.village === NONE ? p.village_id !== null : p.village_id !== f.village)) return false;
    return true;
  });
}

/** Values to offer in the filter dropdowns, taken from the photos themselves. */
export function filterOptions(photos: MyPhoto[]) {
  const programs = new Map<string, string>();
  const villages = new Map<string, string>();
  const activities = new Set<string>();
  let noActivity = false;
  let noVillage = false;
  for (const p of photos) {
    if (p.program_id) programs.set(p.program_id, p.program_name ?? "—");
    if (p.village_id) villages.set(p.village_id, p.village_name ?? "—");
    else noVillage = true;
    if (p.activity) activities.add(p.activity);
    else noActivity = true;
  }
  const byName = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
  return {
    programs: [...programs].sort(byName),
    villages: [...villages].sort(byName),
    activities: [...activities].sort((a, b) => a.localeCompare(b)),
    noActivity,
    noVillage,
  };
}

export type VillageGroup = { key: string; village: string | null; photos: MyPhoto[] };
export type ActivityGroup = { key: string; activity: string | null; count: number; villages: VillageGroup[] };
export type DateGroup = { key: string; date: string | null; count: number; activities: ActivityGroup[] };

/** Date (newest first) > activity type > village > photos. Photos with no date, activity or village get their own group, last. */
export function groupPhotos(photos: MyPhoto[]): DateGroup[] {
  const dates = new Map<string, DateGroup>();
  for (const p of photos) {
    const dKey = p.event_date ?? NONE;
    let d = dates.get(dKey);
    if (!d) dates.set(dKey, (d = { key: dKey, date: p.event_date, count: 0, activities: [] }));
    d.count++;
    const aKey = p.activity ?? NONE;
    let a = d.activities.find((x) => x.key === aKey);
    if (!a) d.activities.push((a = { key: aKey, activity: p.activity, count: 0, villages: [] }));
    a.count++;
    const vKey = p.village_id ?? NONE;
    let v = a.villages.find((x) => x.key === vKey);
    if (!v) a.villages.push((v = { key: vKey, village: p.village_name, photos: [] }));
    v.photos.push(p);
  }
  const lastIfNone = <T extends { key: string }>(a: T, b: T) => (a.key === NONE ? 1 : b.key === NONE ? -1 : 0);
  const out = [...dates.values()].sort((a, b) => lastIfNone(a, b) || b.key.localeCompare(a.key));
  for (const d of out) {
    d.activities.sort((a, b) => lastIfNone(a, b) || (a.activity ?? "").localeCompare(b.activity ?? ""));
    for (const a of d.activities) a.villages.sort((x, y) => lastIfNone(x, y) || (x.village ?? "").localeCompare(y.village ?? ""));
  }
  return out;
}
