import "server-only";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { getProvider } from "@/lib/storage";
import type { MoveBatchResult, MovePreview } from "@/types/cleanup";
import type { ProviderName } from "@/types/storage";

type MoveRow = {
  id: string;
  storage_key: string;
  thumb_key: string;
  size_bytes: number;
  thumb_size_bytes: number | null;
  original_deleted: boolean;
  program_slug: string;
};

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function previewMove(session: Session, from: ProviderName): Promise<MovePreview> {
  const { data, error } = await session.supabase.rpc("storage_usage");
  if (error) throw toApiError(error);
  const row = ((data ?? []) as { provider: string; used_bytes: number; active_count: number; trashed_count: number; archived_count: number }[]).find(
    (r) => r.provider === from,
  );
  return {
    count: Number(row?.active_count ?? 0) + Number(row?.trashed_count ?? 0) + Number(row?.archived_count ?? 0),
    bytes: Number(row?.used_bytes ?? 0),
    archived: Number(row?.archived_count ?? 0),
  };
}

/**
 * Moves one batch. Per photo: copy original (unless archived) and thumbnail to the new storage,
 * check they arrived, update the row (mark_moved), and only then delete the old files.
 * A photo that fails is left where it was and reported; the browser excludes it from later batches.
 */
export async function moveBatch(session: Session, from: ProviderName, to: ProviderName, limit: number, exclude: string[]): Promise<MoveBatchResult> {
  const { data, error } = await session.supabase.rpc("move_candidates", { p_from: from, p_limit: limit, p_exclude: exclude });
  if (error) throw toApiError(error);
  const rows = (data ?? []) as MoveRow[];
  const src = getProvider(from);
  const dst = getProvider(to);
  let moved = 0;
  const failed: MoveBatchResult["failed"] = [];

  for (const r of rows) {
    const created: string[] = [];
    try {
      let newOriginal: string | null = null;
      if (!r.original_deleted) {
        const file = await src.getBytes(r.storage_key);
        const body = await readAll(file.body);
        ({ key: newOriginal } = await dst.putObject({ kind: "original", fileId: r.id, programSlug: r.program_slug, body, contentType: "image/jpeg" }));
        created.push(newOriginal);
        const check = await dst.head(newOriginal);
        if (!check || check.size !== body.byteLength) throw new Error("The copied original did not match.");
      }
      const thumbFile = await src.getBytes(r.thumb_key);
      const thumbBody = await readAll(thumbFile.body);
      const { key: newThumb } = await dst.putObject({ kind: "thumb", fileId: r.id, programSlug: r.program_slug, body: thumbBody, contentType: "image/jpeg" });
      created.push(newThumb);
      if (!(await dst.head(newThumb))) throw new Error("The copied thumbnail is missing.");

      const { error: markError } = await session.supabase.rpc("mark_moved", {
        p_id: r.id,
        p_to: to,
        p_storage_key: newOriginal,
        p_thumb_key: newThumb,
      });
      if (markError) throw new Error(markError.message);
      created.length = 0; // the row now points at the new files: they must stay

      // Old copies go last; if this fails the photo still works (orphan files only cost space).
      await src.delete(r.original_deleted ? [r.thumb_key] : [r.storage_key, r.thumb_key]).catch((err) => {
        console.warn("[move] old files not deleted", r.id, err);
      });
      moved++;
    } catch (err) {
      if (created.length) await dst.delete(created).catch(() => undefined); // never leave half a copy
      failed.push({ id: r.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const { data: next } = await session.supabase.rpc("move_candidates", { p_from: from, p_limit: 1, p_exclude: [...exclude, ...failed.map((f) => f.id)] });
  if (moved || failed.length) {
    await logActivity({ action: "storage_moved", detail: { from, to, moved, failed: failed.length } });
  }
  return { moved, failed, remaining: (next ?? []).length };
}
