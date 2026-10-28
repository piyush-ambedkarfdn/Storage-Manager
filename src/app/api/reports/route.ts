import { ApiError, handle, parseBody, parseQuery } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { createReportSchema, joinReport, reportListQuery } from "@/lib/schemas/report";
import { toPhotoDto } from "@/lib/storage";
import { PHOTO_COLUMNS } from "@/types/photo";
import type { ReportWithPhotos } from "@/types/report";

const REPORT_COLUMNS =
  "id, uploaded_by, program_id, district_id, block_id, panchayat_id, village_id, activity_type, event_date, report, report_parts, theme_ids, beneficiary_count, created_at";

/**
 * POST: create the field report of an upload batch (before its photos). The phone's queue sends a
 * client_ref, so a retried request returns the same report instead of a second one.
 */
export const POST = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const input = await parseBody(createReportSchema, req);

  const { data: existing } = await supabase.from("field_reports").select("id").eq("client_ref", input.client_ref).maybeSingle();
  if (existing) return { id: existing.id as string, existed: true };

  const { data: themes } = await supabase.from("calendar_options").select("id").eq("type", "theme").in("id", input.theme_ids);
  if ((themes ?? []).length !== input.theme_ids.length) throw new ApiError(400, "One of the chosen themes no longer exists. Pick again.");

  const { data, error } = await supabase
    .from("field_reports")
    .insert({
      uploaded_by: profile.id,
      client_ref: input.client_ref,
      program_id: input.program_id,
      district_id: input.district_id,
      block_id: input.block_id ?? null,
      panchayat_id: input.panchayat_id ?? null,
      village_id: input.village_id ?? null,
      activity_type: input.activity_type,
      event_date: input.event_date,
      report: joinReport(input.report_parts),
      report_parts: input.report_parts,
      theme_ids: input.theme_ids,
      beneficiary_count: input.beneficiary_count ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase.from("field_reports").select("id").eq("client_ref", input.client_ref).maybeSingle();
      if (again) return { id: again.id as string, existed: true };
    }
    throw toApiError(error);
  }
  await logActivity({ action: "report_created", entityType: "field_report", entityId: data.id, detail: { themes: input.theme_ids.length } });
  return { id: data.id as string, existed: false };
});

type Named = { name: string | null } | null;

/** GET: the signed-in person's own reports with their photos, newest first (My uploads). */
export const GET = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const { limit, before } = parseQuery(reportListQuery, req.url);
  let query = supabase
    .from("field_reports")
    .select(
      `${REPORT_COLUMNS}, program:programs(name), district:districts(name), block:blocks(name), panchayat:panchayats(name), village:villages(name)`,
    )
    .eq("uploaded_by", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  const reports = (data ?? []) as unknown as (ReportWithPhotos & {
    program: Named;
    district: Named;
    block: Named;
    panchayat: Named;
    village: Named;
  })[];

  const ids = reports.map((r) => r.id);
  const { data: photoRows, error: photoError } = ids.length
    ? await supabase
        .from("photos")
        .select(PHOTO_COLUMNS)
        .in("report_id", ids)
        .eq("uploaded_by", profile.id)
        .in("status", ["pending", "active", "rejected"])
        .order("created_at")
    : { data: [], error: null };
  if (photoError) throw toApiError(photoError);
  const photos = (photoRows ?? []).map((r) => toPhotoDto(r as Parameters<typeof toPhotoDto>[0]));

  const out: ReportWithPhotos[] = reports.map(({ program, district, block, panchayat, village, ...r }) => ({
    ...r,
    program_name: program?.name ?? null,
    place_path: [district?.name, block?.name, panchayat?.name, village?.name].filter(Boolean).join(" / "),
    photos: photos.filter((p) => p.report_id === r.id),
  }));
  return { reports: out, nextBefore: reports.length === limit ? reports[reports.length - 1].created_at : null };
});
