import { ApiError, handle, parseBody, parseQuery } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { createPhotoSchema, photoListQuery } from "@/lib/schemas/photo";
import { getProvider, toPhotoDto } from "@/lib/storage";
import { verify } from "@/lib/storage/secrets";
import { checkFieldValues, getProgramFields, setPhotoCategories } from "@/lib/program-fields";
import { PHOTO_COLUMNS } from "@/types/photo";

/**
 * POST: registers an uploaded photo. Checks the receipt (the server issued these storage keys to this
 * person), that the files really exist, and that the report is theirs. A duplicate (same fingerprint)
 * removes the just-uploaded files and returns { duplicate: true }.
 */
export const POST = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const input = await parseBody(createPhotoSchema, req);

  if (!verify(`upload:${profile.id}:${input.provider}:${input.original_key}:${input.thumb_key}`, input.receipt)) {
    throw new ApiError(400, "This upload was not issued to you. Please upload the photo again.");
  }
  const provider = getProvider(input.provider);

  const { data: report } = await supabase
    .from("field_reports")
    .select("id, program_id, district_id, block_id, panchayat_id, village_id, activity_type, event_date")
    .eq("id", input.report_id)
    .eq("uploaded_by", profile.id)
    .maybeSingle();
  if (!report) throw new ApiError(404, "The report for this photo was not found.");

  // program categories: checked before anything is saved. "Required" is enforced by the upload form, not here,
  // so photos already waiting in a phone queue still upload after an admin adds a required category.
  const fields = report.program_id ? await getProgramFields(supabase, report.program_id as string) : [];
  const categoryRows = checkFieldValues(fields, input.field_values, { requireRequired: false });

  let sizeBytes = input.size_bytes;
  if (input.provider === "r2") {
    const [orig, thumb] = await Promise.all([provider.head(input.original_key), provider.head(input.thumb_key)]);
    if (!orig || !thumb) throw new ApiError(409, "The photo did not finish uploading. It will be tried again.");
    sizeBytes = orig.size || sizeBytes;
  }

  const row = {
    uploaded_by: profile.id,
    report_id: report.id,
    taken_by: input.taken_by || profile.full_name,
    program_id: report.program_id,
    district_id: report.district_id,
    block_id: input.village_id ? (input.block_id ?? null) : report.block_id,
    panchayat_id: input.village_id ? (input.panchayat_id ?? null) : report.panchayat_id,
    village_id: input.village_id ?? report.village_id,
    activity_type: report.activity_type,
    event_date: report.event_date,
    consent: input.consent,
    has_children: input.has_children,
    rating: input.rating ?? null,
    note: input.note ?? null,
    storage_provider: input.provider,
    storage_key: input.original_key,
    thumb_key: input.thumb_key,
    width: input.width,
    height: input.height,
    size_bytes: sizeBytes,
    thumb_size_bytes: input.thumb_size_bytes,
    content_hash: input.content_hash,
    exif_taken_at: input.exif_taken_at,
  };
  const { data, error } = await supabase.from("photos").insert(row).select(PHOTO_COLUMNS).single();
  if (error) {
    if (error.code === "23505") {
      await provider.delete([input.original_key, input.thumb_key]).catch(() => undefined);
      await logActivity({ action: "upload_skipped_duplicate", detail: { hash: input.content_hash } });
      return { duplicate: true };
    }
    throw toApiError(error);
  }
  if (categoryRows.length) {
    try {
      await setPhotoCategories(supabase, data.id as string, categoryRows);
    } catch (err) {
      // the photo is safe; an admin can set the categories on the photo page
      console.error("[photos] categories not saved", data.id, err);
    }
  }
  await logActivity({
    action: "upload",
    entityType: "photo",
    entityId: data.id,
    detail: { report_id: report.id, provider: input.provider, bytes: sizeBytes },
  });
  return { photo: toPhotoDto(data as Parameters<typeof toPhotoDto>[0]), duplicate: false };
});

/** GET ?report_id=: the signed-in person's own active photos (admins: any), newest first. */
export const GET = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const { report_id, limit } = parseQuery(photoListQuery, req.url);
  let query = supabase.from("photos").select(PHOTO_COLUMNS).eq("status", "active").order("created_at", { ascending: false }).limit(limit);
  if (profile.role !== "admin") query = query.eq("uploaded_by", profile.id);
  if (report_id) query = query.eq("report_id", report_id);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return { photos: (data ?? []).map((r) => toPhotoDto(r as Parameters<typeof toPhotoDto>[0])) };
});
