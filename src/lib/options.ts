import "server-only";
import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { OPTION_TYPES, type OptionItem, type OptionType, type Program } from "@/types/options";

export { OPTION_TYPES };
export type { OptionType };

const OPTION_COLUMNS = "id, type, value, color, sort_order, hidden, protects_photos";

/** Options of one list, in order. Hidden ones are left out unless asked for. */
export async function getOptions(type: OptionType, opts: { includeHidden?: boolean } = {}): Promise<OptionItem[]> {
  const supabase = await createClient();
  let query = supabase.from("calendar_options").select(OPTION_COLUMNS).eq("type", type).order("sort_order").order("value");
  if (!opts.includeHidden) query = query.eq("hidden", false);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return (data ?? []) as OptionItem[];
}

export async function getPrograms(opts: { includeHidden?: boolean } = {}): Promise<Program[]> {
  const supabase = await createClient();
  let query = supabase.from("programs").select("id, name, slug, hidden, sort_order").order("sort_order").order("name");
  if (!opts.includeHidden) query = query.eq("hidden", false);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return (data ?? []) as Program[];
}

export function programToOption(p: Program): OptionItem {
  return {
    id: p.id,
    type: "program",
    value: p.name,
    color: null,
    sort_order: p.sort_order,
    hidden: p.hidden,
    protects_photos: false,
    slug: p.slug,
  };
}

/**
 * Turns a Postgres/PostgREST error into a clear ApiError. Shared by the settings APIs
 * (options, programs, places).
 */
export function toApiError(error: { code?: string; message: string }, what = "This"): ApiError {
  switch (error.code) {
    case "23505":
      return new ApiError(409, `${what} name already exists. Use a different name or merge the two.`);
    case "23503":
      return new ApiError(409, `${what} is still used (by places, photos or posts). Merge it or hide it instead of deleting.`);
    case "P0001":
      return new ApiError(409, error.message);
    case "42501":
      return new ApiError(403, "Only admins can do this.");
    default:
      return new ApiError(500, `The database refused the change: ${error.message}`);
  }
}

/** URL-safe slug for a program. Devanagari-only names fall back to "program". */
export function slugify(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "program";
}
