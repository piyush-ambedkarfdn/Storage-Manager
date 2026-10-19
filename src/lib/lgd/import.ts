import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import type { LgdResult, LgdRow } from "@/lib/lgd/types";

/**
 * Runs the lgd_import() database function (migration 0002). commit=false is a preview: the database does
 * the full import, keeps the counts and rolls everything back. All matching rules live in SQL.
 * Rows should belong to one district per call so each call stays short (Supabase limits statement time).
 */
export async function runLgdImport(session: Session, rows: LgdRow[], commit: boolean): Promise<LgdResult> {
  const { data, error } = await session.supabase.rpc("lgd_import", { p_rows: rows, p_commit: commit });
  if (error) {
    if (/statement timeout|canceling statement/i.test(error.message)) {
      throw new ApiError(504, "The import took too long. Import fewer districts at a time.");
    }
    throw new ApiError(500, `The import failed: ${error.message}`);
  }
  return data as LgdResult;
}
