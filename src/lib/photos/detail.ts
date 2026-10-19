import "server-only";
import { isEnabled } from "@/config/features";
import type { Session } from "@/lib/auth";
import { applyGalleryFilters, parseFilters } from "@/lib/gallery/filters";
import { toPhotoDto } from "@/lib/storage";
import { PHOTO_COLUMNS } from "@/types/photo";
import type { PhotoDetail, ReportDetail } from "@/types/photo-detail";

type Named = { name: string | null } | null;

const REPORT_COLUMNS =
  "id, uploaded_by, program_id, district_id, block_id, panchayat_id, village_id, activity_type, event_date, report, report_parts, theme_ids, beneficiary_count, created_at, " +
  "ai_summary, ai_problems, ai_theme_ids, ai_report_en, ai_report_hi, ai_sections, ai_missing, ai_model, ai_processed_at, ai_review_status, ai_reviewed_at, " +
  "uploader:profiles!uploaded_by(full_name), reviewer:profiles!ai_reviewed_by(full_name)";

/**
 * Everything for /admin/photos/[id]: the photo with place names, what staff entered, the field report
 * (as written and as improved by AI), other photos of the same report, Previous/Next inside the
 * gallery filter that was open (`from` = its query string), and where the photo is used.
 * Only tables of installed phases are queried. Returns null if the photo does not exist (or is purged).
 */
export async function getPhotoDetail(session: Session, id: string, from = ""): Promise<PhotoDetail | null> {
  const { supabase } = session;
  const { data: row } = await supabase
    .from("photos")
    .select(
      `${PHOTO_COLUMNS}, thumb_size_bytes, ai_quality, ai_suitable_for_social, program:programs(name), district:districts(name), block:blocks(name), panchayat:panchayats(name), village:villages(name), uploader:profiles!uploaded_by(full_name)`,
    )
    .eq("id", id)
    .neq("status", "purged")
    .maybeSingle();
  if (!row) return null;
  const r = row as unknown as Parameters<typeof toPhotoDto>[0] & {
    created_at: string;
    report_id: string | null;
    status: string;
    thumb_size_bytes: number | null;
    ai_quality: number | null;
    ai_suitable_for_social: boolean | null;
    program: Named;
    district: Named;
    block: Named;
    panchayat: Named;
    village: Named;
    uploader: { full_name: string | null } | null;
  };
  const dto = toPhotoDto(r);

  // field report
  let report: ReportDetail | null = null;
  if (r.report_id) {
    const { data } = await supabase.from("field_reports").select(REPORT_COLUMNS).eq("id", r.report_id).maybeSingle();
    if (data) {
      const { uploader, reviewer, ...rest } = data as unknown as ReportDetail & {
        uploader: { full_name: string | null } | null;
        reviewer: { full_name: string | null } | null;
      };
      report = { ...rest, uploader_name: uploader?.full_name ?? null, ai_reviewed_by_name: reviewer?.full_name ?? null };
    }
  }

  // other photos of the same report
  let siblings: PhotoDetail["siblings"] = [];
  if (r.report_id) {
    const { data } = await supabase
      .from("photos")
      .select("id, storage_provider, storage_key, thumb_key")
      .eq("report_id", r.report_id)
      .eq("status", "active")
      .neq("id", id)
      .order("created_at")
      .limit(24);
    siblings = (data ?? []).map((s) => ({ id: s.id as string, thumbUrl: toPhotoDto(s as Parameters<typeof toPhotoDto>[0]).thumbUrl }));
  }

  // Previous (newer) / Next (older) within the gallery filter, same order as the grid
  const filters = parseFilters(new URLSearchParams(from));
  const themed = filters.themes.length > 0;
  const neighbourColumns: string = themed ? "id, report:field_reports!inner(theme_ids)" : "id";
  const base = () => {
    const q = supabase.from("photos").select(neighbourColumns);
    return applyGalleryFilters<typeof q>(q, filters);
  };
  const [prev, next] = await Promise.all([
    base().gt("created_at", r.created_at).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    base().lt("created_at", r.created_at).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // where it is used (only once those phases are installed)
  const usage: PhotoDetail["usage"] = { calendar: null, stories: null };
  if (isEnabled("calendar")) {
    const { data } = await supabase
      .from("content_item_photos")
      .select("item:content_items(id, title, publish_date, platform, status)")
      .eq("photo_id", id);
    usage.calendar = ((data ?? []) as unknown as { item: NonNullable<PhotoDetail["usage"]["calendar"]>[number] | null }[])
      .map((d) => d.item)
      .filter((x): x is NonNullable<typeof x> => !!x);
  }
  if (isEnabled("stories")) {
    const { data } = await supabase.from("story_photos").select("story:stories(id, title, kind, status)").eq("photo_id", id);
    usage.stories = ((data ?? []) as unknown as { story: NonNullable<PhotoDetail["usage"]["stories"]>[number] | null }[])
      .map((d) => d.story)
      .filter((x): x is NonNullable<typeof x> => !!x);
  }

  const archived = r.status === "archived";
  return {
    photo: {
      ...dto,
      program_name: r.program?.name ?? null,
      district_name: r.district?.name ?? null,
      block_name: r.block?.name ?? null,
      panchayat_name: r.panchayat?.name ?? null,
      village_name: r.village?.name ?? null,
      uploader_name: r.uploader?.full_name ?? null,
      ai_quality: r.ai_quality,
      ai_suitable_for_social: r.ai_suitable_for_social,
      thumb_size_bytes: r.thumb_size_bytes,
    },
    displayUrl: archived ? dto.thumbUrl : `/api/media/${id}?v=original`,
    originalAvailable: !archived,
    report,
    siblings,
    prevId: (prev.data as { id?: string } | null)?.id ?? null,
    nextId: (next.data as { id?: string } | null)?.id ?? null,
    usage,
  };
}
