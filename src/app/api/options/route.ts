import { ApiError, handle, parseBody, parseQuery } from "@/lib/api";
import { assertAdmin, assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { createOptionSchema, optionListQuery, reorderSchema } from "@/lib/schemas/options";
import type { OptionItem } from "@/types/options";

const COLUMNS = "id, type, value, color, sort_order, hidden, protects_photos";

/** GET ?type=status (or all lists) &all=1 (admins: include hidden). Any active user. */
export const GET = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const { type, all } = parseQuery(optionListQuery, req.url);
  let query = supabase.from("calendar_options").select(COLUMNS).order("type").order("sort_order").order("value");
  if (type) query = query.eq("type", type);
  if (!(all === "1" && profile.role === "admin")) query = query.eq("hidden", false);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return { options: (data ?? []) as OptionItem[] };
});

/** POST { type, value, color? } (admin). Added at the end of the list. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const input = await parseBody(createOptionSchema, req);
  const { data: last } = await supabase
    .from("calendar_options")
    .select("sort_order")
    .eq("type", input.type)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("calendar_options")
    .insert({ type: input.type, value: input.value, color: input.color ?? null, sort_order: (last?.sort_order ?? 0) + 1 })
    .select(COLUMNS)
    .single();
  if (error) throw toApiError(error, "An option with this");
  await logActivity({ action: "option_changed", entityType: input.type, entityId: data.id, detail: { op: "create", value: input.value } });
  return { option: data as OptionItem };
});

/** PUT { type, ids } (admin): saves a new order. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { type, ids } = await parseBody(reorderSchema, req);
  if (type === "program") throw new ApiError(400, "Use /api/programs to reorder programs.");
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("calendar_options").update({ sort_order: i + 1 }).eq("id", id).eq("type", type);
    if (error) throw toApiError(error);
  }
  await logActivity({ action: "option_changed", entityType: type, detail: { op: "reorder" } });
  return { ok: true };
});
