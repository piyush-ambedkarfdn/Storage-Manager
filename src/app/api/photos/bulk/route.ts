import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { checkFieldValues, getProgramFields, setPhotoCategories } from "@/lib/program-fields";
import { bulkEditSchema } from "@/lib/schemas/gallery";

/**
 * POST { ids, set?, categories? } (admin): change program, place, activity, date, consent or the children
 * flag on many photos, and/or set one program's categories (only photos of that program are changed).
 */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids, set, categories } = await parseBody(bulkEditSchema, req);
  let updated = 0;
  if (set) {
    const { data, error } = await supabase.from("photos").update(set).in("id", ids).neq("status", "purged").select("id");
    if (error) throw toApiError(error);
    updated = data?.length ?? 0;
  }

  let categorised = 0;
  let skipped = 0;
  if (categories) {
    const fields = await getProgramFields(supabase, categories.program_id, true);
    const rows = checkFieldValues(fields, categories.values, { requireRequired: false });
    const touched = new Set(Object.entries(categories.values).filter(([, v]) => v.length).map(([k]) => k));
    const { data: photos, error } = await supabase.from("photos").select("id, program_id, category_option_ids").in("id", ids).neq("status", "purged");
    if (error) throw toApiError(error);
    for (const p of photos ?? []) {
      if (p.program_id !== categories.program_id) {
        skipped++;
        continue;
      }
      // keep this photo's values for categories that were left as they are
      const keep = fields
        .filter((f) => !touched.has(f.id))
        .flatMap((f) => f.options.filter((o) => (p.category_option_ids as string[]).includes(o.id)).map((o) => ({ field_id: f.id, option_id: o.id })));
      await setPhotoCategories(supabase, p.id as string, [...keep, ...rows]);
      categorised++;
    }
  }

  await logActivity({
    action: "photos_edited",
    entityType: "photo",
    detail: { count: Math.max(updated, categorised), ids: ids.slice(0, 50), set, categories: categories ? { program: categories.program_id, photos: categorised, skipped } : undefined },
  });
  return { updated: Math.max(updated, categorised), skipped };
});
