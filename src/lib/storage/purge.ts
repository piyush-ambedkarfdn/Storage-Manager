import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/storage";
import type { ProviderName } from "@/types/storage";

type StoredFile = { id: string; storage_provider: ProviderName; storage_key: string | null; thumb_key: string | null };

/**
 * Deletes files from whichever storage holds each photo. Returns the ids whose files are gone
 * (a storage error leaves those photos untouched, so nothing is marked deleted while its file still exists).
 */
export async function deletePhotoFiles(rows: StoredFile[], what: "original" | "both"): Promise<{ ok: string[]; failed: { id: string; error: string }[] }> {
  const ok: string[] = [];
  const failed: { id: string; error: string }[] = [];
  const byProvider = new Map<ProviderName, StoredFile[]>();
  rows.forEach((r) => byProvider.set(r.storage_provider, [...(byProvider.get(r.storage_provider) ?? []), r]));
  for (const [name, list] of byProvider) {
    const provider = getProvider(name);
    if (name === "r2") {
      // one call for many files (deletes are free on R2)
      const keys = list.flatMap((r) => (what === "both" ? [r.storage_key, r.thumb_key] : [r.storage_key])).filter((k): k is string => !!k);
      try {
        await provider.delete(keys);
        ok.push(...list.map((r) => r.id));
      } catch (err) {
        list.forEach((r) => failed.push({ id: r.id, error: err instanceof Error ? err.message : String(err) }));
      }
    } else {
      for (const r of list) {
        try {
          const keys = (what === "both" ? [r.storage_key, r.thumb_key] : [r.storage_key]).filter((k): k is string => !!k);
          await provider.delete(keys);
          ok.push(r.id);
        } catch (err) {
          failed.push({ id: r.id, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  }
  return { ok, failed };
}

/**
 * Daily purge (cron, service role): trashed photos past the trash window are deleted from their
 * storage first, then marked purged. At most `limit` per run so the job stays short.
 */
export async function runPurge(limit = 400): Promise<{ purged: number; failed: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purge_due");
  if (error) throw new Error(`purge_due failed: ${error.message}`);
  const due = ((data ?? []) as StoredFile[]).slice(0, limit);
  if (!due.length) return { purged: 0, failed: 0 };
  const { ok, failed } = await deletePhotoFiles(due, "both");
  let purged = 0;
  for (let i = 0; i < ok.length; i += 200) {
    const { data: n, error: markError } = await admin.rpc("mark_purged", { p_ids: ok.slice(i, i + 200) });
    if (markError) throw new Error(`mark_purged failed: ${markError.message}`);
    purged += Number(n ?? 0);
  }
  await admin.from("activity_log").insert({
    actor: null,
    action: "photos_purged",
    entity_type: "photo",
    detail: { purged, failed: failed.length, by: "daily job" },
  });
  return { purged, failed: failed.length };
}
