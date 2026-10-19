import "server-only";
import { ApiError } from "@/lib/api";
import { toApiError } from "@/lib/options";
import type { createClient } from "@/lib/supabase/server";
import type { FieldValues, ProgramField } from "@/types/program-fields";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const FIELD_SELECT =
  "id, program_id, label, label_hi, multiple, required, sort_order, hidden, program:programs(name), options:program_field_options(id, field_id, value, value_hi, color, sort_order, hidden)";

/** Categories of one program (or of every program), in order, with their options. */
export async function getProgramFields(supabase: Supabase, programId: string | null, includeHidden = false): Promise<ProgramField[]> {
  let q = supabase.from("program_fields").select(FIELD_SELECT).order("sort_order").order("label");
  if (programId) q = q.eq("program_id", programId);
  if (!includeHidden) q = q.eq("hidden", false);
  const { data, error } = await q;
  if (error) throw toApiError(error);
  return ((data ?? []) as unknown as (ProgramField & { program: { name: string } | null })[]).map(({ program, ...f }) => ({
    ...f,
    program_name: program?.name,
    options: [...f.options].filter((o) => includeHidden || !o.hidden).sort((a, b) => a.sort_order - b.sort_order || a.value.localeCompare(b.value)),
  }));
}

/**
 * Checks chosen values against a program's categories: each option must belong to its category,
 * one-choice categories get one value, and (when asked) every required category has a value.
 * Returns the rows to store.
 */
export function checkFieldValues(fields: ProgramField[], values: FieldValues, opts: { requireRequired: boolean }): { field_id: string; option_id: string }[] {
  const rows: { field_id: string; option_id: string }[] = [];
  for (const f of fields) {
    const chosen = [...new Set(values[f.id] ?? [])];
    if (!chosen.length) {
      if (opts.requireRequired && f.required) throw new ApiError(400, `Choose ${f.label}.`);
      continue;
    }
    if (!f.multiple && chosen.length > 1) throw new ApiError(400, `Choose only one ${f.label}.`);
    for (const optionId of chosen) {
      if (!f.options.some((o) => o.id === optionId)) throw new ApiError(400, `That choice is not in ${f.label}.`);
      rows.push({ field_id: f.id, option_id: optionId });
    }
  }
  const known = new Set(fields.map((f) => f.id));
  if (Object.keys(values).some((id) => (values[id]?.length ?? 0) > 0 && !known.has(id))) {
    throw new ApiError(400, "A chosen category does not belong to this program.");
  }
  return rows;
}

/** Replaces a photo's categories (database triggers check program and single choice, and update the photo). */
export async function setPhotoCategories(supabase: Supabase, photoId: string, rows: { field_id: string; option_id: string }[]) {
  const { error: delError } = await supabase.from("photo_field_values").delete().eq("photo_id", photoId);
  if (delError) throw toApiError(delError);
  if (!rows.length) return;
  const { error } = await supabase.from("photo_field_values").insert(rows.map((r) => ({ ...r, photo_id: photoId })));
  if (error) throw toApiError(error);
}
