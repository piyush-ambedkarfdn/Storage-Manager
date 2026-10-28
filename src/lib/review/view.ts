import type { ReviewPhoto } from "@/types/review";

export const NONE = "__none__";

export type ReviewFilters = { staff: string | null; village: string | null; activity: string | null };
export const NO_REVIEW_FILTERS: ReviewFilters = { staff: null, village: null, activity: null };

export function hasReviewFilters(f: ReviewFilters): boolean {
  return Boolean(f.staff || f.village || f.activity);
}

export function filterReview(photos: ReviewPhoto[], f: ReviewFilters): ReviewPhoto[] {
  return photos.filter((p) => {
    if (f.staff && p.staff_id !== f.staff) return false;
    if (f.village && (f.village === NONE ? p.village_id !== null : p.village_id !== f.village)) return false;
    if (f.activity && (f.activity === NONE ? p.activity !== null : p.activity !== f.activity)) return false;
    return true;
  });
}

/** Values for the filter dropdowns, taken from the waiting photos themselves. */
export function reviewOptions(photos: ReviewPhoto[]) {
  const staff = new Map<string, string>();
  const villages = new Map<string, string>();
  const activities = new Set<string>();
  let noActivity = false;
  let noVillage = false;
  for (const p of photos) {
    if (p.staff_id) staff.set(p.staff_id, p.staff_name ?? "—");
    if (p.village_id) villages.set(p.village_id, p.village_name ?? "—");
    else noVillage = true;
    if (p.activity) activities.add(p.activity);
    else noActivity = true;
  }
  const byName = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
  return { staff: [...staff].sort(byName), villages: [...villages].sort(byName), activities: [...activities].sort((a, b) => a.localeCompare(b)), noActivity, noVillage };
}

export type ReviewActivityGroup = { key: string; activity: string | null; photos: ReviewPhoto[] };
export type ReviewVillageGroup = { key: string; village: string | null; district: string | null; count: number; activities: ReviewActivityGroup[] };

/** Village > activity type > photos, the same shape as the download. Groups without a village or activity come last. */
export function groupReview(photos: ReviewPhoto[]): ReviewVillageGroup[] {
  const villages = new Map<string, ReviewVillageGroup>();
  for (const p of photos) {
    const vKey = p.village_id ?? NONE;
    let v = villages.get(vKey);
    if (!v) villages.set(vKey, (v = { key: vKey, village: p.village_name, district: p.district_name, count: 0, activities: [] }));
    v.count++;
    const aKey = p.activity ?? NONE;
    let a = v.activities.find((x) => x.key === aKey);
    if (!a) v.activities.push((a = { key: aKey, activity: p.activity, photos: [] }));
    a.photos.push(p);
  }
  const lastIfNone = <T extends { key: string }>(a: T, b: T) => (a.key === NONE ? 1 : b.key === NONE ? -1 : 0);
  const out = [...villages.values()].sort((a, b) => lastIfNone(a, b) || (a.village ?? "").localeCompare(b.village ?? ""));
  for (const v of out) v.activities.sort((a, b) => lastIfNone(a, b) || (a.activity ?? "").localeCompare(b.activity ?? ""));
  return out;
}
