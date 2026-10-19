import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import { trashActionSchema } from "@/lib/schemas/cleanup";
import { getProvider } from "@/lib/storage";
import { archiveByIds, deleteNow } from "@/lib/storage/cleanup";
import type { TrashItem } from "@/types/cleanup";
import type { ProviderName } from "@/types/storage";

export const maxDuration = 60;

/** GET (admin): the trash, oldest first, with the date each photo will be deleted for good. */
export const GET = handle(async () => {
  const { supabase } = await assertAdmin();
  const [{ data, error }, { data: setting }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, storage_provider, thumb_key, event_date, trashed_at, size_bytes, village:villages(name)")
      .eq("status", "trashed")
      .order("trashed_at")
      .limit(500),
    supabase.from("app_settings").select("value").eq("key", "storage").maybeSingle(),
  ]);
  if (error) throw toApiError(error);
  const days = Number((setting?.value as { trash_days?: number } | undefined)?.trash_days ?? 30);
  const items: TrashItem[] = (
    (data ?? []) as unknown as { id: string; storage_provider: ProviderName; thumb_key: string; event_date: string | null; trashed_at: string; size_bytes: number; village: { name: string | null } | null }[]
  ).map((r) => ({
    id: r.id,
    thumbUrl: getProvider(r.storage_provider).thumbUrl(r.id, r.thumb_key),
    village_name: r.village?.name ?? null,
    event_date: r.event_date,
    trashed_at: r.trashed_at,
    purgeOn: new Date(new Date(r.trashed_at).getTime() + days * 86_400_000).toISOString(),
    size_bytes: r.size_bytes,
    storage_provider: r.storage_provider,
  }));
  return { items, trashDays: days };
});

/**
 * POST { action, ids } (admin).
 * trash: move to the trash (photos in Scheduled/Published posts are skipped and reported). Used by the gallery.
 * restore: back to active. archive: delete originals, keep thumbnails. delete_now: delete trashed photos for good.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { action, ids } = await parseBody(trashActionSchema, req);
  switch (action) {
    case "trash": {
      const { data, error } = await session.supabase.rpc("trash_photos", { p_ids: ids });
      if (error) throw toApiError(error);
      const r = (data as { trashed: number; skipped: string[] }[] | null)?.[0];
      return { done: r?.trashed ?? 0, skipped: r?.skipped ?? [] };
    }
    case "restore": {
      const { data, error } = await session.supabase.rpc("restore_photos", { p_ids: ids });
      if (error) throw toApiError(error);
      return { done: Number(data ?? 0) };
    }
    case "archive":
      return archiveByIds(session, ids);
    case "delete_now":
      return deleteNow(session, ids);
    default:
      throw new ApiError(400, "Unknown action.");
  }
});
