import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin, assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { findSimilar, SIMILARITY } from "@/lib/names";
import { slugify, toApiError } from "@/lib/options";
import { createProgramSchema, reorderSchema } from "@/lib/schemas/options";
import type { Program } from "@/types/options";

const COLUMNS = "id, name, slug, hidden, sort_order";

/** GET ?all=1 (admins: include hidden). Any active user. */
export const GET = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const all = new URL(req.url).searchParams.get("all") === "1" && profile.role === "admin";
  let query = supabase.from("programs").select(COLUMNS).order("sort_order").order("name");
  if (!all) query = query.eq("hidden", false);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return { programs: (data ?? []) as Program[] };
});

/** POST { name } (admin). The slug is made once from the name and never changes (it is used in storage paths). */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { name } = await parseBody(createProgramSchema, req);

  const same = (await findSimilar("program", name)).find((m) => m.score >= SIMILARITY.exact);
  if (same) throw new ApiError(409, `A program called "${same.name}" already exists.`);

  const base = slugify(name);
  const { data: taken } = await supabase.from("programs").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((t) => t.slug as string));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  const { data: last } = await supabase.from("programs").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("programs")
    .insert({ name, slug, sort_order: (last?.sort_order ?? 0) + 1 })
    .select(COLUMNS)
    .single();
  if (error) throw toApiError(error, "A program with this");
  await logActivity({ action: "option_changed", entityType: "program", entityId: data.id, detail: { op: "create", name, slug } });
  return { program: data as Program };
});

/** PUT { type: "program", ids } (admin): saves a new order. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids } = await parseBody(reorderSchema, req);
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("programs").update({ sort_order: i + 1 }).eq("id", id);
    if (error) throw toApiError(error);
  }
  await logActivity({ action: "option_changed", entityType: "program", detail: { op: "reorder" } });
  return { ok: true };
});
