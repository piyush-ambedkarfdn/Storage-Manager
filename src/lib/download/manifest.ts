import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { activityLabel } from "@/config/activity-types";
import { applyGalleryFilters, parseFilters } from "@/lib/gallery/filters";
import { getProvider } from "@/lib/storage";
import { csvCell, fileNameFor, folderFor, uniquePaths, type PathValues } from "@/lib/download/paths";
import { MAX_DOWNLOAD_PHOTOS } from "@/lib/schemas/gallery";
import type { DownloadLevel, DownloadManifest, ManifestFile } from "@/types/gallery";
import type { ProviderName } from "@/types/storage";

type Named = { name: string | null } | null;
type Row = {
  id: string;
  report_id: string | null;
  storage_provider: ProviderName;
  storage_key: string;
  status: string;
  size_bytes: number;
  activity_type: string | null;
  event_date: string | null;
  taken_by: string | null;
  consent: string;
  has_children: boolean;
  note: string | null;
  ai_description: string | null;
  ai_tags: string[] | null;
  created_at: string;
  program: Named;
  district: Named;
  block: Named;
  panchayat: Named;
  village: Named;
  uploader: { full_name: string | null } | null;
  report: { theme_ids: string[] } | null;
};

const SELECT =
  "id, report_id, storage_provider, storage_key, status, size_bytes, activity_type, event_date, taken_by, consent, has_children, note, ai_description, ai_tags, created_at, " +
  "program:programs(name), district:districts(name), block:blocks(name), panchayat:panchayats(name), village:villages(name), uploader:profiles!uploaded_by(full_name)";

/**
 * The download list: one entry per photo with its folder path and a URL the browser can fetch
 * (signed R2 link, or /api/media for Google Drive), plus _metadata.csv. No zipping on the server.
 */
export async function buildManifest(
  session: Session,
  input: { photoIds?: string[]; query?: string },
  levels: DownloadLevel[],
  template: string,
): Promise<DownloadManifest> {
  const filters = parseFilters(new URLSearchParams(input.query ?? ""));
  const themed = !input.photoIds && filters.themes.length > 0;
  let q = session.supabase
    .from("photos")
    .select(themed ? `${SELECT}, report:field_reports!inner(theme_ids)` : `${SELECT}, report:field_reports(theme_ids)`)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(MAX_DOWNLOAD_PHOTOS + 1);
  if (input.photoIds?.length) q = q.in("id", input.photoIds).neq("status", "purged");
  else q = applyGalleryFilters(q, filters);
  const { data, error } = await q;
  if (error) throw new ApiError(500, `Could not list the photos: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length > MAX_DOWNLOAD_PHOTOS) {
    throw new ApiError(413, `More than ${MAX_DOWNLOAD_PHOTOS} photos. Narrow the folders or dates and download in parts.`);
  }

  const { data: themeRows } = await session.supabase.from("calendar_options").select("id, value").eq("type", "theme");
  const themeName = new Map((themeRows ?? []).map((t) => [t.id as string, t.value as string]));

  const unique = uniquePaths();
  const counters = new Map<string, number>();
  const files: ManifestFile[] = [];
  const csv: string[] = [
    [
      "file", "photo_id", "program", "district", "block", "panchayat", "village", "activity", "event_date", "taken_by",
      "uploaded_by", "consent", "has_children", "note", "themes", "ai_description", "ai_tags", "storage", "size_bytes", "uploaded_at",
    ].join(","),
  ];
  let skippedArchived = 0;

  for (const r of rows) {
    if (r.status === "archived") {
      skippedArchived++;
      continue; // the original was removed to save space; only the thumbnail exists
    }
    const v: PathValues = {
      program: r.program?.name ?? null,
      district: r.district?.name ?? null,
      block: r.block?.name ?? null,
      panchayat: r.panchayat?.name ?? null,
      village: r.village?.name ?? null,
      activity: r.activity_type ? activityLabel(r.activity_type) : null,
      date: r.event_date,
      id: r.id,
    };
    const folders = folderFor(levels, v);
    const dirKey = folders.join("/");
    const seq = (counters.get(dirKey) ?? 0) + 1;
    counters.set(dirKey, seq);
    const path = unique(folders, fileNameFor(template, v, seq));
    const provider = getProvider(r.storage_provider);
    const url = r.storage_provider === "r2" ? await provider.originalUrl(r.id, r.storage_key, 60 * 60) : `/api/media/${r.id}?v=original`;
    files.push({ photoId: r.id, path, url, size: r.size_bytes });
    csv.push(
      [
        path, r.id, v.program, v.district, v.block, v.panchayat, v.village, v.activity, r.event_date, r.taken_by,
        r.uploader?.full_name, r.consent, r.has_children ? "yes" : "no", r.note,
        (r.report?.theme_ids ?? []).map((id) => themeName.get(id) ?? id), r.ai_description, r.ai_tags, r.storage_provider, r.size_bytes, r.created_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return { files, csv: "\uFEFF" + csv.join("\r\n") + "\r\n", totalBytes: files.reduce((n, f) => n + f.size, 0), skippedArchived };
}
