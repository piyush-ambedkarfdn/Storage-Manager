import { ApiError, handle, parseBody, parseQuery } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { exactMatch, findSimilar } from "@/lib/names";
import { toApiError } from "@/lib/options";
import { createPlaceSchema, placeListQuery } from "@/lib/schemas/places";
import type { Place, PlaceLevel } from "@/types/places";

const TABLE: Record<PlaceLevel, string> = { district: "districts", block: "blocks", panchayat: "panchayats", village: "villages" };
const FK: Record<PlaceLevel, string | null> = { district: null, block: "district_id", panchayat: "block_id", village: "panchayat_id" };

// Parent names are embedded through foreign keys so each row carries its full path.
const SELECT: Record<PlaceLevel, string> = {
  district: "id, name, lgd_code, source",
  block: "id, name, lgd_code, source, approved, district_id, suggester:profiles(full_name), district:districts(name)",
  panchayat:
    "id, name, lgd_code, source, approved, block_id, suggester:profiles(full_name), block:blocks(name, district:districts(name))",
  village:
    "id, name, lgd_code, source, approved, panchayat_id, suggester:profiles(full_name), panchayat:panchayats(name, block:blocks(name, district:districts(name)))",
};

type Named = { name?: string | null } | null | undefined;
type Row = {
  id: string;
  name: string;
  lgd_code: number | null;
  source: "lgd" | "user";
  approved?: boolean;
  district_id?: string;
  block_id?: string;
  panchayat_id?: string;
  suggester?: { full_name: string | null } | null;
  district?: Named;
  block?: (Named & { district?: Named }) | null;
  panchayat?: (Named & { block?: (Named & { district?: Named }) | null }) | null;
};

function toPlace(level: PlaceLevel, r: Row): Place {
  const parts: (string | null | undefined)[] =
    level === "block"
      ? [r.district?.name]
      : level === "panchayat"
        ? [r.block?.district?.name, r.block?.name]
        : level === "village"
          ? [r.panchayat?.block?.district?.name, r.panchayat?.block?.name, r.panchayat?.name]
          : [];
  return {
    id: r.id,
    level,
    name: r.name,
    lgd_code: r.lgd_code,
    source: r.source,
    approved: r.approved ?? true,
    parent_id: r.district_id ?? r.block_id ?? r.panchayat_id ?? null,
    path: parts.filter(Boolean).join(" / "),
    suggested_by_name: r.suggester?.full_name ?? null,
  };
}

/** GET ?level=village&parent=<id>&q=ram&pending=1&limit=50&offset=0 → { items, total }. Any active user. */
export const GET = handle(async (req) => {
  const { supabase } = await assertUser();
  const { level, parent, q, pending, limit, offset } = parseQuery(placeListQuery, req.url);
  let query = supabase.from(TABLE[level]).select(SELECT[level], { count: "exact" });
  const fk = FK[level];
  if (parent && fk) query = query.eq(fk, parent);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  if (pending && level !== "district") query = query.eq("approved", false);
  const { data, error, count } = await query.order("name").range(offset, offset + limit - 1);
  if (error) throw toApiError(error);
  return { items: ((data ?? []) as unknown as Row[]).map((r) => toPlace(level, r)), total: count ?? 0 };
});

/**
 * POST { level, name, parent_id }. Admins add approved places. Staff can only suggest a block, panchayat
 * or village: it is saved as approved = false for an admin to review. A name that already exists
 * under the same parent (same spelling after normalising, or a saved alias) is returned instead of duplicated.
 */
export const POST = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const { level, name, parent_id } = await parseBody(createPlaceSchema, req);
  const isAdmin = profile.role === "admin";

  if (level === "district") {
    if (!isAdmin) throw new ApiError(403, "Only admins can add a district.");
    const { data, error } = await supabase.from("districts").insert({ name }).select(SELECT.district).single();
    if (error) throw toApiError(error, "A district with this");
    return { place: toPlace("district", data as unknown as Row), existed: false };
  }

  if (!parent_id) throw new ApiError(400, "Choose where this place belongs first.");
  const existing = exactMatch(await findSimilar(level, name, parent_id), parent_id);
  if (existing) {
    const { data } = await supabase.from(TABLE[level]).select(SELECT[level]).eq("id", existing.id).single();
    return { place: toPlace(level, data as unknown as Row), existed: true };
  }

  const row: Record<string, unknown> = { name, [FK[level]!]: parent_id, source: "user", approved: isAdmin };
  if (!isAdmin) row.suggested_by = profile.id;
  const { data, error } = await supabase.from(TABLE[level]).insert(row).select(SELECT[level]).single();
  if (error) throw toApiError(error);
  const place = toPlace(level, data as unknown as Row);
  await logActivity({
    action: isAdmin ? "option_changed" : "name_suggested",
    entityType: level,
    entityId: place.id,
    detail: { op: "create", name },
  });
  return { place, existed: false };
});
