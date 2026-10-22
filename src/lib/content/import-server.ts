import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { IMPORT_LIMITS } from "@/lib/content/import-template";
import { toApiError } from "@/lib/options";
import type { ImportPayload } from "@/lib/schemas/content-import";
import { getProvider } from "@/lib/storage";
import { assertCanUpload } from "@/lib/storage-guard";
import type { ImportRecord, ImportResult } from "@/types/content-import";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const IMPORT_COLUMNS = "id, file_name, size_bytes, rows_in_file, rows_imported, rows_skipped, options_added, storage_provider, created_at";

/**
 * Saves the original file in the active storage (R2 or Google Drive) and the rows in the database.
 * Order: storage first, then ONE database call that records the import and inserts every post (all or nothing).
 * If the database refuses, the stored file is deleted again, so nothing is left half done.
 */
export async function runImport(session: Session, file: File, payload: ImportPayload): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  const isXlsx = lower.endsWith(".xlsx");
  if (!isXlsx && !lower.endsWith(".csv")) throw new ApiError(400, "Upload an .xlsx or .csv file.");
  if (file.size === 0) throw new ApiError(400, "The file is empty.");
  if (file.size > IMPORT_LIMITS.maxBytes) throw new ApiError(413, "The file is bigger than 4 MB.");

  const body = new Uint8Array(await file.arrayBuffer());
  if (isXlsx && !(body[0] === 0x50 && body[1] === 0x4b)) throw new ApiError(400, "This file is not a real .xlsx file.");

  // Free-tier guard: refuses when the active storage is almost full or not set up.
  const providerName = await assertCanUpload(body.byteLength);
  const provider = getProvider(providerName);

  let key: string;
  try {
    ({ key } = await provider.putFile({
      folder: "imports/calendar",
      fileId: crypto.randomUUID(),
      fileName: file.name,
      body,
      contentType: isXlsx ? XLSX : "text/csv",
    }));
  } catch (err) {
    console.error("[import] storage write failed", err);
    throw new ApiError(502, "The file could not be saved in storage, so nothing was imported. Try again.");
  }

  const { data, error } = await session.supabase.rpc("calendar_import", {
    p_rows: payload.rows,
    p_file: { file_name: file.name.slice(0, 200), storage_provider: providerName, storage_key: key, size_bytes: body.byteLength },
    p_add_options: payload.addOptions,
    p_skip_duplicates: payload.skipDuplicates,
  });
  if (error) {
    await provider.delete([key]).catch((e) => console.error("[import] could not remove the stored file", e));
    throw toApiError(error);
  }

  const result = data as ImportResult;
  await logActivity({
    action: "content_created",
    entityType: "calendar_import",
    entityId: result.import_id,
    detail: { imported_from: file.name, imported: result.imported, skipped: result.skipped, options_added: result.options_added },
  });
  return result;
}

export async function listImports(session: Session): Promise<ImportRecord[]> {
  const { data, error } = await session.supabase.from("calendar_imports").select(IMPORT_COLUMNS).order("created_at", { ascending: false }).limit(10);
  if (error) throw toApiError(error);
  return (data ?? []) as ImportRecord[];
}
