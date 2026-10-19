import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { photosInfo } from "@/lib/content/queries";
import { toApiError } from "@/lib/options";
import { getProvider } from "@/lib/storage";
import { storyBlockers } from "@/lib/stories/blockers";
import type { ContentReport } from "@/types/content";
import type { ProviderName } from "@/types/storage";
import { STORY_COLUMNS, type Story, type StoryDetail, type StorySuggestion } from "@/types/story";

type Named = { name: string | null } | null;

export async function listStories(session: Session, q: { kind?: string; status?: string }): Promise<Story[]> {
  let query = session.supabase
    .from("stories")
    .select(`${STORY_COLUMNS}, links:story_photos(sort_order, photo:photos(id, storage_provider, thumb_key))`)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (q.kind) query = query.eq("kind", q.kind);
  if (q.status) query = query.eq("status", q.status);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return ((data ?? []) as unknown as (Story & { links: { sort_order: number; photo: { id: string; storage_provider: ProviderName; thumb_key: string } | null }[] })[]).map(
    ({ links, ...s }) => {
      const first = [...links].sort((a, b) => a.sort_order - b.sort_order).find((l) => l.photo)?.photo;
      return { ...s, photo_count: links.length, first_thumb: first ? getProvider(first.storage_provider).thumbUrl(first.id, first.thumb_key) : null };
    },
  );
}

/** Field reports by id, shaped like the calendar's report context. */
export async function reportsByIds(session: Session, ids: string[]): Promise<ContentReport[]> {
  if (!ids.length) return [];
  const { data, error } = await session.supabase
    .from("field_reports")
    .select("id, activity_type, event_date, report, report_parts, ai_report_en, ai_review_status, theme_ids, district:districts(name), panchayat:panchayats(name), village:villages(name)")
    .in("id", ids)
    .order("event_date", { ascending: false });
  if (error) throw toApiError(error);
  return ((data ?? []) as unknown as (Omit<ContentReport, "place_path"> & { district: Named; panchayat: Named; village: Named })[]).map(
    ({ district, panchayat, village, ...r }) => ({ ...r, place_path: [district?.name, panchayat?.name, village?.name].filter(Boolean).join(" / ") }),
  );
}

export async function getStoryDetail(session: Session, id: string): Promise<StoryDetail> {
  const { data, error } = await session.supabase.from("stories").select(`${STORY_COLUMNS}, reviewer:profiles!reviewed_by(full_name)`).eq("id", id).maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "This story does not exist.");
  const { reviewer, ...story } = data as unknown as Story & { reviewer: { full_name: string | null } | null };
  const [{ data: links }, { count }] = await Promise.all([
    session.supabase.from("story_photos").select("photo_id").eq("story_id", id).order("sort_order"),
    session.supabase.from("content_items").select("id", { count: "exact", head: true }).eq("source_story_id", id),
  ]);
  const info = await photosInfo(session, (links ?? []).map((l) => l.photo_id as string));
  const reports = await reportsByIds(session, story.source_report_ids);
  return { story, photos: info.photos, reports, blockers: storyBlockers(info.photos), reviewer_name: reviewer?.full_name ?? null, calendar_count: count ?? 0 };
}

export async function createStory(
  session: Session,
  input: { kind: Story["kind"]; title: string; source_report_ids: string[]; theme_ids: string[]; language: "en" | "hi"; status?: Story["status"] },
): Promise<Story> {
  const { data, error } = await session.supabase
    .from("stories")
    .insert({ ...input, status: input.status ?? "draft", created_by: session.profile.id })
    .select(STORY_COLUMNS)
    .single();
  if (error) throw toApiError(error);
  await logActivity({ action: "story_created", entityType: "story", entityId: data.id as string, detail: { kind: input.kind, title: input.title } });
  return data as Story;
}

/** Photos of a story, in order. Photos without consent can be attached to drafts (they block "ready"). */
export async function setStoryPhotos(session: Session, id: string, photoIds: string[]) {
  const { error: delError } = await session.supabase.from("story_photos").delete().eq("story_id", id);
  if (delError) throw toApiError(delError);
  if (photoIds.length) {
    const { error } = await session.supabase
      .from("story_photos")
      .insert([...new Set(photoIds)].map((photo_id, i) => ({ story_id: id, photo_id, sort_order: i })));
    if (error) throw toApiError(error);
  }
}

export async function listSuggestions(session: Session, status = "new"): Promise<StorySuggestion[]> {
  const { data, error } = await session.supabase
    .from("story_suggestions")
    .select("id, kind, title, problem, places, why_now, rationale, report_ids, theme_ids, suggested_window, status, story_id, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw toApiError(error);
  return (data ?? []) as StorySuggestion[];
}
