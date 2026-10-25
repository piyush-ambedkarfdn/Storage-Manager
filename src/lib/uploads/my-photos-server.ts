import "server-only";
import { ApiError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { activityTypeOf } from "@/lib/download/my-manifest";
import { getProvider } from "@/lib/storage";
import type { MyPhoto } from "@/types/my-photos";
import type { ProviderName } from "@/types/storage";

export const MY_PHOTOS_LIMIT = 2000;

type Row = {
  id: string;
  event_date: string | null;
  created_at: string;
  note: string | null;
  program_id: string | null;
  village_id: string | null;
  storage_provider: ProviderName;
  thumb_key: string;
  program: { name: string | null } | null;
  village: { name: string | null } | null;
  values: { field: { label: string; sort_order: number } | null; option: { value: string; sort_order: number } | null }[];
};

const SELECT =
  "id, event_date, created_at, note, program_id, village_id, storage_provider, thumb_key, program:programs(name), village:villages(name), " +
  "values:photo_field_values(field:program_fields(label, sort_order), option:program_field_options(value, sort_order))";

/** The person's own active photos, newest first (the page groups and filters them). */
export async function listMyPhotos(session: Session): Promise<MyPhoto[]> {
  const { data, error } = await session.supabase
    .from("photos")
    .select(SELECT)
    .eq("uploaded_by", session.profile.id)
    .eq("status", "active")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(MY_PHOTOS_LIMIT);
  if (error) throw new ApiError(500, `Could not list your photos: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    event_date: r.event_date,
    created_at: r.created_at,
    note: r.note,
    program_id: r.program_id,
    program_name: r.program?.name ?? null,
    village_id: r.village_id,
    village_name: r.village?.name ?? null,
    activity: activityTypeOf(r.values ?? []),
    thumbUrl: getProvider(r.storage_provider).thumbUrl(r.id, r.thumb_key),
  }));
}
