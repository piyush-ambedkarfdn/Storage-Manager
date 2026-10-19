import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { isEnabled } from "@/config/features";
import { applyGalleryFilters, parseFilters } from "@/lib/gallery/filters";
import { toApiError } from "@/lib/options";
import { toPhotoDto } from "@/lib/storage";
import { PHOTO_COLUMNS } from "@/types/photo";
import type { GalleryPage, GalleryPhoto } from "@/types/gallery";

const cursorSchema = z.iso.datetime({ offset: true });
type Named = { name: string | null } | null;

/**
 * GET ?f=…&a=…&t=…&from&to&consent&story&by&unused&cursor&limit (admin).
 * Newest uploads first; `cursor` is the created_at of the last photo of the previous page.
 */
export const GET = handle(async (req): Promise<GalleryPage> => {
  const { supabase } = await assertAdmin();
  const url = new URL(req.url);
  const filters = parseFilters(url.searchParams);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 48, 12), 96);
  const cursorRaw = url.searchParams.get("cursor");
  if (cursorRaw && !cursorSchema.safeParse(cursorRaw).success) throw new ApiError(400, "Bad page cursor.");

  const table = filters.unused && isEnabled("calendar") ? "photos_unused" : "photos";
  const select =
    `${PHOTO_COLUMNS}, program:programs(name), district:districts(name), panchayat:panchayats(name), village:villages(name)` +
    (filters.themes.length ? ", report:field_reports!inner(theme_ids)" : "");
  let q = supabase.from(table).select(select, { count: cursorRaw ? undefined : "exact" });
  q = applyGalleryFilters(q, filters);
  if (cursorRaw) q = q.lt("created_at", cursorRaw);
  const { data, error, count } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) throw toApiError(error);

  const photos: GalleryPhoto[] = ((data ?? []) as unknown as (Parameters<typeof toPhotoDto>[0] & {
    created_at: string;
    program: Named;
    district: Named;
    panchayat: Named;
    village: Named;
    report?: unknown;
  })[]).map(({ program, district, panchayat, village, report: _r, ...row }) => {
    void _r;
    return {
      ...toPhotoDto(row as Parameters<typeof toPhotoDto>[0]),
      program_name: program?.name ?? null,
      district_name: district?.name ?? null,
      panchayat_name: panchayat?.name ?? null,
      village_name: village?.name ?? null,
    };
  });
  return {
    photos,
    nextCursor: photos.length === limit ? photos[photos.length - 1].created_at : null,
    total: count ?? null,
  };
});
