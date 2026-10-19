import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { isEnabled } from "@/config/features";
import { parseFilters } from "@/lib/gallery/filters";
import { buildTree, type FolderCountRow } from "@/lib/gallery/tree";
import { toApiError } from "@/lib/options";

/**
 * GET ?a=…&t=…&from&to&consent&story&by&unused (admin): the explorer tree with photo counts for the
 * other filters. Phase 6 version: also honours "not used in calendar yet".
 */
export const GET = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const f = parseFilters(new URL(req.url).searchParams);
  const { data, error } = await supabase.rpc("folder_counts", {
    p_activity: f.activity.length ? f.activity : null,
    p_from: f.from ?? null,
    p_to: f.to ?? null,
    p_consent: f.consent ?? null,
    p_has_story: f.hasStory ?? null,
    p_themes: f.themes.length ? f.themes : null,
    p_uploader: f.uploader ?? null,
    p_unused_only: !!f.unused && isEnabled("calendar"),
  });
  if (error) throw toApiError(error);
  const rows = (data ?? []) as FolderCountRow[];
  return { tree: buildTree(rows), total: rows.reduce((n, r) => n + Number(r.photo_count), 0) };
});
