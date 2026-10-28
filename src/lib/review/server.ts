import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { activityTypeOf, type CategoryValue } from "@/lib/uploads/activity-type";
import { getProvider } from "@/lib/storage";
import type { ReviewDecisionResult, ReviewPhoto } from "@/types/review";
import type { ProviderName } from "@/types/storage";

export const REVIEW_LIST_LIMIT = 2000;

type Row = {
  id: string;
  created_at: string;
  event_date: string | null;
  note: string | null;
  consent: "yes" | "no" | "unknown";
  has_children: boolean;
  uploaded_by: string | null;
  program_id: string | null;
  village_id: string | null;
  storage_provider: ProviderName;
  thumb_key: string;
  program: { name: string | null } | null;
  village: { name: string | null } | null;
  district: { name: string | null } | null;
  uploader: { full_name: string | null } | null;
  values: CategoryValue[];
};

const SELECT =
  "id, created_at, event_date, note, consent, has_children, uploaded_by, program_id, village_id, storage_provider, thumb_key, " +
  "program:programs(name), village:villages(name), district:districts(name), uploader:profiles!uploaded_by(full_name), " +
  "values:photo_field_values(field:program_fields(label, sort_order), option:program_field_options(value, sort_order))";

/** Photos waiting for review, newest first. Admin only (the caller checks). */
export async function listPending(session: Session): Promise<ReviewPhoto[]> {
  const { data, error } = await session.supabase
    .from("photos")
    .select(SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(REVIEW_LIST_LIMIT);
  if (error) throw new ApiError(500, `Could not list the photos waiting for review: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    event_date: r.event_date,
    note: r.note,
    consent: r.consent,
    has_children: r.has_children,
    staff_id: r.uploaded_by,
    staff_name: r.uploader?.full_name ?? null,
    program_id: r.program_id,
    program_name: r.program?.name ?? null,
    village_id: r.village_id,
    village_name: r.village?.name ?? null,
    district_name: r.district?.name ?? null,
    activity: activityTypeOf(r.values ?? []),
    thumbUrl: getProvider(r.storage_provider).thumbUrl(r.id, r.thumb_key),
  }));
}

export async function countPending(session: Session): Promise<number> {
  const { count, error } = await session.supabase.from("photos").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw toApiError(error);
  return count ?? 0;
}

/**
 * Approve (the photo joins the library) or reject (the files are deleted from storage; the person who uploaded
 * sees the reason). Only photos that are still waiting change, so two admins deciding at once cannot clash.
 */
export async function decide(session: Session, ids: string[], approve: boolean, note?: string): Promise<ReviewDecisionResult> {
  const { data, error } = await session.supabase.rpc("review_photos", { p_ids: ids, p_approve: approve, p_note: note ?? null });
  if (error) throw toApiError(error);
  const changed = (data ?? []) as { id: string; storage_provider: ProviderName; storage_key: string; thumb_key: string }[];

  if (!approve && changed.length) {
    const byProvider = new Map<ProviderName, string[]>();
    for (const r of changed) byProvider.set(r.storage_provider, [...(byProvider.get(r.storage_provider) ?? []), r.storage_key, r.thumb_key]);
    for (const [provider, keys] of byProvider) {
      // the decision is saved; a file that cannot be deleted now is only wasted space, so do not fail the request
      await getProvider(provider)
        .delete(keys)
        .catch((e) => console.error("[review] could not delete rejected files", provider, e));
    }
  }
  await logActivity({
    action: "photos_edited",
    entityType: "photo",
    detail: { review: approve ? "approved" : "rejected", count: changed.length, ...(note ? { note } : {}) },
  });
  return { requested: ids.length, changed: changed.length };
}
