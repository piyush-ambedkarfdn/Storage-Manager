import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin, assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { invalidateActivityTypes } from "@/lib/activity-types-server";
import { createActivityTypeSchema, reorderActivityTypesSchema } from "@/lib/schemas/activity-types";

const COLUMNS = "id, label, label_hi, color, sort_order, hidden, program_id";

/** Short code from the name ("Kit distribution" → "kit-distribution"); Hindi-only names get "type", "type-2"… */
function slugify(label: string): string {
  const s = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36);
  return s || "type";
}

/** GET (any active user): every type with hidden ones, in order. */
export const GET = handle(async () => {
  const { supabase } = await assertUser();
  const { data, error } = await supabase.from("activity_types").select(COLUMNS).order("sort_order").order("label");
  if (error) throw toApiError(error);
  return { types: data ?? [] };
});

/** POST { label, label_hi?, color } (admin): a new type at the end. Its code is made once and never changes. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const input = await parseBody(createActivityTypeSchema, req);
  const { data: existing } = await supabase.from("activity_types").select("id, sort_order, program_id");
  const used = new Set((existing ?? []).map((r) => r.id as string));
  // a program's type gets the program's short name in front, so two programs can both have "Other"
  let prefix = "";
  if (input.program_id) {
    const { data: program } = await supabase.from("programs").select("slug").eq("id", input.program_id).maybeSingle();
    if (!program) throw new ApiError(400, "This program does not exist.");
    prefix = `${slugify(String(program.slug ?? "program"))}-`;
  }
  const base = (prefix + slugify(input.label)).slice(0, 36);
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  // the new type goes at the end of its own list (the program's, or the general one)
  const scope = (existing ?? []).filter((r) => (r.program_id ?? null) === (input.program_id ?? null));
  const sort = Math.max(0, ...scope.map((r) => Number(r.sort_order))) + 1;
  const { error } = await supabase.from("activity_types").insert({ id, ...input, program_id: input.program_id ?? null, sort_order: sort });
  if (error) throw toApiError(error, "An activity type with this");
  invalidateActivityTypes();
  await logActivity({ action: "option_changed", entityType: "activity_type", entityId: id, detail: { op: "create", label: input.label } });
  return { id };
});

/** PUT { ids } (admin): new order. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids } = await parseBody(reorderActivityTypesSchema, req);
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("activity_types").update({ sort_order: i + 1 }).eq("id", id);
    if (error) throw toApiError(error);
  }
  invalidateActivityTypes();
  return { ok: true };
});
