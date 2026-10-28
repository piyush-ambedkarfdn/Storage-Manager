import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { csvCell, fileNameFor, safeSegment, uniquePaths, type PathValues } from "@/lib/download/paths";
import { MAX_DOWNLOAD_PHOTOS } from "@/lib/schemas/gallery";
import { getProvider } from "@/lib/storage";
import { activityTypeOf, NO_ACTIVITY_FOLDER, NO_VILLAGE_FOLDER, type CategoryValue } from "@/lib/uploads/activity-type";
import type { DownloadManifest, ManifestFile } from "@/types/gallery";
import type { ProviderName } from "@/types/storage";

type Row = {
  id: string;
  storage_provider: ProviderName;
  storage_key: string;
  size_bytes: number;
  event_date: string | null;
  created_at: string;
  village: { name: string | null } | null;
  district: { name: string | null } | null;
  program: { name: string | null } | null;
  uploader: { full_name: string | null } | null;
  values: CategoryValue[];
};

const SELECT =
  "id, storage_provider, storage_key, size_bytes, event_date, created_at, village:villages(name), district:districts(name), program:programs(name), " +
  "uploader:profiles!uploaded_by(full_name), " +
  "values:photo_field_values(field:program_fields(label, sort_order), option:program_field_options(value, sort_order))";

/**
 * The download list for the photos waiting for review (admin only), as  Village / Activity type / photo.jpg  plus
 * _metadata.csv. The browser downloads the files and zips them, as in the gallery's download.
 */
export async function buildReviewManifest(session: Session, input: { photoIds?: string[]; all?: boolean }): Promise<DownloadManifest> {
  let q = session.supabase
    .from("photos")
    .select(SELECT)
    .eq("status", "pending")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(MAX_DOWNLOAD_PHOTOS + 1);
  if (input.photoIds?.length) q = q.in("id", input.photoIds);
  const { data, error } = await q;
  if (error) throw new ApiError(500, `Could not list the photos: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length > MAX_DOWNLOAD_PHOTOS) throw new ApiError(413, `More than ${MAX_DOWNLOAD_PHOTOS} photos. Download them in parts.`);

  const unique = uniquePaths();
  const counters = new Map<string, number>();
  const files: ManifestFile[] = [];
  const csv = [["file", "photo_id", "village", "district", "activity_type", "uploaded_by", "event_date", "uploaded_at"].join(",")];

  for (const r of rows) {
    const village = r.village?.name?.trim() || NO_VILLAGE_FOLDER;
    const activity = activityTypeOf(r.values ?? []) ?? NO_ACTIVITY_FOLDER;
    const folders = [safeSegment(village), safeSegment(activity)];
    const dirKey = folders.join("/");
    const seq = (counters.get(dirKey) ?? 0) + 1;
    counters.set(dirKey, seq);
    const v: PathValues = { program: r.program?.name ?? null, district: r.district?.name ?? null, block: null, panchayat: null, village, activity, date: r.event_date, id: r.id };
    const path = unique(folders, fileNameFor("{date}_{village}_{activity}_{seq}", v, seq));
    const provider = getProvider(r.storage_provider);
    const url = r.storage_provider === "r2" ? await provider.originalUrl(r.id, r.storage_key, 60 * 60) : `/api/media/${r.id}?v=original`;
    files.push({ photoId: r.id, path, url, size: r.size_bytes });
    csv.push([path, r.id, village, r.district?.name, activity, r.uploader?.full_name, r.event_date, r.created_at].map(csvCell).join(","));
  }
  return { files, csv: "\uFEFF" + csv.join("\r\n") + "\r\n", totalBytes: files.reduce((n, f) => n + f.size, 0), skippedArchived: 0 };
}
