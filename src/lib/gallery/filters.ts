import type { Consent } from "@/types/photo";
import { CONSENT_VALUES } from "@/types/photo";
import { TREE_LEVELS, type FolderKey, type GalleryFilters } from "@/types/gallery";

/**
 * Gallery filters <-> URL query string (so a view can be bookmarked or shared), and the
 * PostgREST conditions for them. Used by the browser (URL) and the server (queries).
 *   f = folder key (repeat), a = activity id (repeat), t = theme id (repeat),
 *   from, to (YYYY-MM-DD), consent, story=1|0, by = uploader id, unused=1, c = category option id (repeat),
 *   r = rating (1-5 = that many stars or more, 0 = not rated)
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const NONE = "none";

function validKey(key: string): boolean {
  const parts = key.split("/");
  return parts.length >= 1 && parts.length <= 4 && parts.every((p) => p === NONE || UUID.test(p));
}

export function parseFilters(params: URLSearchParams): GalleryFilters {
  const consent = params.get("consent");
  const story = params.get("story");
  return {
    folders: [...new Set(params.getAll("f").filter(validKey))].slice(0, 100),
    activity: [...new Set(params.getAll("a").filter((a) => /^[a-z0-9-]{1,40}$/.test(a)))],
    themes: [...new Set(params.getAll("t").filter((t) => UUID.test(t)))].slice(0, 20),
    from: DATE.test(params.get("from") ?? "") ? params.get("from")! : undefined,
    to: DATE.test(params.get("to") ?? "") ? params.get("to")! : undefined,
    consent: (CONSENT_VALUES as readonly string[]).includes(consent ?? "") ? (consent as Consent) : undefined,
    hasStory: story === "1" ? true : story === "0" ? false : undefined,
    uploader: UUID.test(params.get("by") ?? "") ? params.get("by")! : undefined,
    unused: params.get("unused") === "1" || undefined,
    categories: [...new Set(params.getAll("c").filter((c) => UUID.test(c)))].slice(0, 30),
    rating: /^[0-5]$/.test(params.get("r") ?? "") ? Number(params.get("r")) : undefined,
  };
}

export function filtersToParams(f: GalleryFilters, opts: { withFolders?: boolean } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (opts.withFolders !== false) f.folders.forEach((k) => p.append("f", k));
  f.activity.forEach((a) => p.append("a", a));
  f.themes.forEach((t) => p.append("t", t));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.consent) p.set("consent", f.consent);
  if (f.hasStory !== undefined) p.set("story", f.hasStory ? "1" : "0");
  if (f.uploader) p.set("by", f.uploader);
  if (f.unused) p.set("unused", "1");
  f.categories.forEach((c) => p.append("c", c));
  if (f.rating !== undefined) p.set("r", String(f.rating));
  return p;
}

export function hasAnyFilter(f: GalleryFilters): boolean {
  return filtersToParams(f).toString() !== "";
}

const COLUMNS = ["program_id", "district_id", "panchayat_id", "village_id"] as const;

/** PostgREST "or" expression for the ticked folders (each folder = AND of its path). */
export function folderOrExpression(keys: FolderKey[]): string | null {
  if (!keys.length) return null;
  return keys
    .map((key) => {
      const conds = key.split("/").map((id, i) => (id === NONE ? `${COLUMNS[i]}.is.null` : `${COLUMNS[i]}.eq.${id}`));
      return `and(${conds.join(",")})`;
    })
    .join(",");
}

export function keyLevel(key: FolderKey) {
  return TREE_LEVELS[key.split("/").length - 1];
}

/** Minimal shape of a PostgREST filter builder, so this file needs no Supabase types. */
type Filterable<Q> = {
  eq(column: string, value: unknown): Q;
  in(column: string, values: readonly unknown[]): Q;
  gte(column: string, value: unknown): Q;
  lte(column: string, value: unknown): Q;
  or(filters: string): Q;
  overlaps(column: string, value: readonly unknown[]): Q;
  is(column: string, value: null): Q;
};

/**
 * Applies the filters to a photos query. When themes are filtered, the select must embed
 * `report:field_reports!inner(theme_ids)`. Pass includeFolders=false for folder counts.
 */
export function applyGalleryFilters<Q extends Filterable<Q>>(query: Q, f: GalleryFilters, includeFolders = true): Q {
  let q = query.eq("status", "active");
  const or = includeFolders ? folderOrExpression(f.folders) : null;
  if (or) q = q.or(or);
  if (f.activity.length) q = q.in("activity_type", f.activity);
  if (f.themes.length) q = q.overlaps("report.theme_ids", f.themes);
  if (f.from) q = q.gte("event_date", f.from);
  if (f.to) q = q.lte("event_date", f.to);
  if (f.consent) q = q.eq("consent", f.consent);
  if (f.hasStory !== undefined) q = q.eq("has_story", f.hasStory);
  if (f.uploader) q = q.eq("uploaded_by", f.uploader);
  if (f.categories.length) q = q.overlaps("category_option_ids", f.categories);
  if (f.rating === 0) q = q.is("rating", null);
  else if (f.rating) q = q.gte("rating", f.rating);
  return q;
}
