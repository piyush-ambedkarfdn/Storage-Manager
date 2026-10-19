import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin, assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { getProgramFields } from "@/lib/program-fields";
import { createFieldSchema, reorderSchema } from "@/lib/schemas/program-fields";

/** GET ?program=<id> (one program) or no program (all), &all=1 (admins: include hidden). Any active user. */
export const GET = handle(async (req) => {
  const { profile, supabase } = await assertUser();
  const url = new URL(req.url);
  const program = url.searchParams.get("program");
  if (program && !z.uuid().safeParse(program).success) throw new ApiError(400, "Bad program.");
  const all = url.searchParams.get("all") === "1" && profile.role === "admin";
  return { fields: await getProgramFields(supabase, program, all) };
});

/** POST { program_id, label, label_hi?, multiple, required, options? } (admin): a new category with its first choices. */
export const POST = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { options, ...input } = await parseBody(createFieldSchema, req);
  const { data: last } = await supabase.from("program_fields").select("sort_order").eq("program_id", input.program_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("program_fields")
    .insert({ ...input, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw toApiError(error, "A category with this");
  if (options.length) {
    const { error: optError } = await supabase
      .from("program_field_options")
      .insert([...new Set(options)].map((value, i) => ({ field_id: data.id, value, sort_order: i + 1 })));
    if (optError) throw toApiError(optError, "A choice with this");
  }
  await logActivity({ action: "option_changed", entityType: "program_field", entityId: data.id, detail: { op: "create", label: input.label, options } });
  return { id: data.id };
});

/** PUT { ids } (admin): new order of a program's categories. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { ids } = await parseBody(reorderSchema, req);
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("program_fields").update({ sort_order: i + 1 }).eq("id", id);
    if (error) throw toApiError(error);
  }
  return { ok: true };
});
