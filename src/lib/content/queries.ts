import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { getProvider } from "@/lib/storage";
import type { ContentItem, ContentPhoto, ContentReport, ContentSummary, PhotosInfo } from "@/types/content";
import type { ProviderName } from "@/types/storage";

export const ITEM_COLUMNS =
  "id, publish_date, platform, content_format, content_pillar, title, content_brief, caption, hashtags, cta, goal, status, production_stage, awareness_day, created_at, updated_at";

type ThumbRow = { id: string; storage_provider: ProviderName; thumb_key: string };
const thumbUrl = (p: ThumbRow) => getProvider(p.storage_provider).thumbUrl(p.id, p.thumb_key);

/** Calendar rows in a date range (or the undated ones), with photo count and first thumbnail. */
export async function listItems(
  session: Session,
  q: { from?: string; to?: string; undated?: boolean; status?: string; platform?: string },
): Promise<ContentItem[]> {
  let query = session.supabase
    .from("content_items")
    .select(`${ITEM_COLUMNS}, links:content_item_photos(sort_order, photo:photos(id, storage_provider, thumb_key))`)
    .order("publish_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1000);
  if (q.undated) query = query.is("publish_date", null);
  else {
    if (q.from) query = query.gte("publish_date", q.from);
    if (q.to) query = query.lte("publish_date", q.to);
  }
  if (q.status) query = query.eq("status", q.status);
  if (q.platform) query = query.eq("platform", q.platform);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return ((data ?? []) as unknown as (ContentItem & { links: { sort_order: number; photo: ThumbRow | null }[] })[]).map(({ links, ...item }) => {
    const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order).filter((l) => l.photo);
    return { ...item, photo_count: sorted.length, first_thumb: sorted[0]?.photo ? thumbUrl(sorted[0].photo) : null };
  });
}

type Named = { name: string | null } | null;

/** Photos (in the given order) with consent info, and the field reports behind them. */
export async function photosInfo(session: Session, photoIds: string[]): Promise<PhotosInfo> {
  if (!photoIds.length) return { photos: [], reports: [] };
  const { data, error } = await session.supabase
    .from("photos")
    .select("id, storage_provider, thumb_key, activity_type, consent, has_children, event_date, report_id, village:villages(name)")
    .in("id", photoIds)
    .neq("status", "purged");
  if (error) throw toApiError(error);
  const rows = (data ?? []) as unknown as (ThumbRow & Omit<ContentPhoto, "thumbUrl" | "village_name"> & { village: Named })[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const photos: ContentPhoto[] = photoIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      id: r.id,
      thumbUrl: thumbUrl(r),
      activity_type: r.activity_type,
      consent: r.consent,
      has_children: r.has_children,
      village_name: r.village?.name ?? null,
      event_date: r.event_date,
      report_id: r.report_id,
    }));

  const reportIds = [...new Set(photos.map((p) => p.report_id).filter((x): x is string => !!x))];
  let reports: ContentReport[] = [];
  if (reportIds.length) {
    const { data: rdata, error: rerr } = await session.supabase
      .from("field_reports")
      .select(
        "id, activity_type, event_date, report, report_parts, ai_report_en, ai_review_status, theme_ids, district:districts(name), panchayat:panchayats(name), village:villages(name)",
      )
      .in("id", reportIds);
    if (rerr) throw toApiError(rerr);
    reports = ((rdata ?? []) as unknown as (Omit<ContentReport, "place_path"> & { district: Named; panchayat: Named; village: Named })[]).map(
      ({ district, panchayat, village, ...r }) => ({
        ...r,
        place_path: [district?.name, panchayat?.name, village?.name].filter(Boolean).join(" / "),
      }),
    );
  }
  return { photos, reports };
}

export async function getItem(session: Session, id: string): Promise<{ item: ContentItem } & PhotosInfo> {
  const { data, error } = await session.supabase.from("content_items").select(ITEM_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "This calendar item does not exist.");
  const { data: links } = await session.supabase
    .from("content_item_photos")
    .select("photo_id, sort_order")
    .eq("content_item_id", id)
    .order("sort_order");
  const info = await photosInfo(session, (links ?? []).map((l) => l.photo_id as string));
  return { item: data as ContentItem, ...info };
}

/** Replaces the photos of an item, in the given order. */
export async function setItemPhotos(session: Session, id: string, photoIds: string[]): Promise<void> {
  const { error: delError } = await session.supabase.from("content_item_photos").delete().eq("content_item_id", id);
  if (delError) throw toApiError(delError);
  if (!photoIds.length) return;
  const rows = [...new Set(photoIds)].map((photo_id, i) => ({ content_item_id: id, photo_id, sort_order: i }));
  const { error } = await session.supabase.from("content_item_photos").insert(rows);
  if (error) throw toApiError(error);
}

export async function createItem(
  session: Session,
  input: Partial<ContentItem> & { title: string; photo_ids: string[] },
): Promise<ContentItem> {
  const { photo_ids, ...fields } = input;
  const { data, error } = await session.supabase
    .from("content_items")
    .insert({ ...fields, created_by: session.profile.id })
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw toApiError(error);
  await setItemPhotos(session, data.id as string, photo_ids);
  await logActivity({ action: "content_created", entityType: "content_item", entityId: data.id as string, detail: { title: input.title, photos: photo_ids.length } });
  return data as ContentItem;
}

/** Everything the dashboard needs in a few calls. */
export async function getSummary(session: Session, today: string): Promise<ContentSummary> {
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const to = in7.toISOString().slice(0, 10);
  const [{ data: sum, error: e1 }, { data: counts, error: e2 }, { data: statuses }, next] = await Promise.all([
    session.supabase.rpc("calendar_summary"),
    session.supabase.rpc("dashboard_counts"),
    session.supabase.from("calendar_options").select("value, protects_photos").eq("type", "status"),
    listItems(session, { from: today, to }),
  ]);
  if (e1) throw toApiError(e1);
  if (e2) throw toApiError(e2);

  const rows = (sum ?? []) as { status: string; production_stage: string; platform: string | null; total: number }[];
  const stage = new Map<string, number>();
  const platform = new Map<string, number>();
  for (const r of rows) {
    stage.set(r.production_stage, (stage.get(r.production_stage) ?? 0) + Number(r.total));
    const p = r.platform ?? "—";
    platform.set(p, (platform.get(p) ?? 0) + Number(r.total));
  }

  // Overdue: date passed and the status is not one that "protects photos" (Scheduled, Published by default).
  const open = (statuses ?? []).filter((s) => !s.protects_photos).map((s) => s.value as string);
  let overdue: ContentItem[] = [];
  if (open.length) {
    const { data } = await session.supabase
      .from("content_items")
      .select(ITEM_COLUMNS)
      .lt("publish_date", today)
      .in("status", open)
      .order("publish_date")
      .limit(20);
    overdue = (data ?? []) as ContentItem[];
  }

  const c = (counts ?? {}) as {
    photos_by_activity?: Record<string, number>;
    reports_by_theme?: Record<string, number>;
    uploads_this_week?: number;
    photos_total?: number;
    photos_unused?: number;
    names_pending?: number;
  };
  return {
    byStage: [...stage].map(([s, total]) => ({ stage: s, total })),
    byPlatform: [...platform].map(([p, total]) => ({ platform: p, total })).sort((a, b) => b.total - a.total),
    next7: next,
    overdue,
    photosByActivity: c.photos_by_activity ?? {},
    reportsByTheme: c.reports_by_theme ?? {},
    library: {
      uploadsThisWeek: c.uploads_this_week ?? 0,
      photosTotal: c.photos_total ?? 0,
      photosUnused: c.photos_unused ?? 0,
      namesPending: c.names_pending ?? 0,
    },
  };
}
