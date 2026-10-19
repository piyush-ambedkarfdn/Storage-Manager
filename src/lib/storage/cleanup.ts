import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/storage";
import { deletePhotoFiles } from "@/lib/storage/purge";
import type { ApplyResult, CleanupFilters, CleanupPreview } from "@/types/cleanup";
import type { ProviderName } from "@/types/storage";

type Candidate = { id: string; storage_provider: ProviderName; storage_key: string; thumb_key: string; size_bytes: number; thumb_size_bytes: number | null };

async function candidates(session: Session, f: CleanupFilters): Promise<Candidate[]> {
  const { data, error } = await session.supabase.rpc("cleanup_candidates", {
    p_older_than_days: f.olderThanDays,
    p_program: f.programId ?? null,
    p_uploader: f.uploaderId ?? null,
    p_only: f.only ?? null,
  });
  if (error) throw toApiError(error);
  return (data ?? []) as Candidate[];
}

/** What a cleanup would touch. Protected photos (in Scheduled/Published posts) are already left out. */
export async function previewCleanup(session: Session, f: CleanupFilters): Promise<CleanupPreview> {
  const rows = await candidates(session, f);
  const byProvider: CleanupPreview["byProvider"] = { r2: { count: 0, bytes: 0 }, gdrive: { count: 0, bytes: 0 } };
  let bytes = 0;
  let archiveBytes = 0;
  for (const r of rows) {
    const total = r.size_bytes + (r.thumb_size_bytes ?? 0);
    bytes += total;
    archiveBytes += r.size_bytes;
    byProvider[r.storage_provider].count++;
    byProvider[r.storage_provider].bytes += total;
  }
  return {
    count: rows.length,
    bytes,
    archiveBytes,
    byProvider,
    sample: rows.slice(0, 24).map((r) => ({ id: r.id, thumbUrl: getProvider(r.storage_provider).thumbUrl(r.id, r.thumb_key) })),
  };
}

/**
 * trash: all matching photos go to the trash (restorable until the purge).
 * archive: one batch at a time, delete the ORIGINAL from its storage, then mark_archived (thumbnail stays).
 * The browser repeats archive until remaining = 0.
 */
export async function applyCleanup(session: Session, f: CleanupFilters, action: "trash" | "archive", batch: number): Promise<ApplyResult> {
  const rows = await candidates(session, f);
  if (action === "trash") {
    const { error, data } = await session.supabase.rpc("trash_photos", { p_ids: rows.map((r) => r.id) });
    if (error) throw toApiError(error);
    const result = (data as { trashed: number }[] | null)?.[0];
    return { done: result?.trashed ?? 0, remaining: 0, failed: [] };
  }
  return archivePhotos(session, rows.slice(0, batch), rows.length);
}

/** Archive specific photos: delete originals first, then mark them archived. */
export async function archivePhotos(session: Session, rows: Candidate[], total = rows.length): Promise<ApplyResult> {
  const { ok, failed } = await deletePhotoFiles(rows, "original");
  let done = 0;
  if (ok.length) {
    const { data, error } = await session.supabase.rpc("mark_archived", { p_ids: ok });
    if (error) throw toApiError(error);
    done = Number(data ?? 0);
  }
  return { done, remaining: Math.max(0, total - rows.length), failed };
}

/** Archive by id (gallery selection). Protected photos are refused by mark_archived and reported. */
export async function archiveByIds(session: Session, ids: string[]): Promise<ApplyResult> {
  const { data, error } = await session.supabase
    .from("photos")
    .select("id, storage_provider, storage_key, thumb_key, size_bytes, thumb_size_bytes")
    .in("id", ids)
    .eq("status", "active");
  if (error) throw toApiError(error);
  const rows: Candidate[] = [];
  const failed: ApplyResult["failed"] = [];
  for (const r of (data ?? []) as Candidate[]) {
    const { data: prot } = await session.supabase.rpc("photo_is_protected", { p_photo: r.id });
    if (prot) failed.push({ id: r.id, error: "Used in a Scheduled or Published post." });
    else rows.push(r);
  }
  const res = await archivePhotos(session, rows);
  return { ...res, failed: [...failed, ...res.failed] };
}

/** Delete trashed photos now (instead of waiting for the daily purge). */
export async function deleteNow(session: Session, ids: string[]): Promise<ApplyResult> {
  const { data, error } = await session.supabase
    .from("photos")
    .select("id, storage_provider, storage_key, thumb_key")
    .in("id", ids)
    .eq("status", "trashed");
  if (error) throw toApiError(error);
  const rows = (data ?? []) as Candidate[];
  if (!rows.length) throw new ApiError(400, "Only photos in the trash can be deleted for good.");
  const { ok, failed } = await deletePhotoFiles(rows, "both");
  // mark_purged is service-role only; the caller already checked that this is an admin.
  const { data: n, error: markError } = await createAdminClient().rpc("mark_purged", { p_ids: ok });
  if (markError) throw toApiError(markError);
  await logActivity({ action: "photos_purged", entityType: "photo", detail: { count: Number(n ?? 0), failed: failed.length, by: "admin" } });
  return { done: Number(n ?? 0), remaining: 0, failed };
}
