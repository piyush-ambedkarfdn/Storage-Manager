import "server-only";
import { toApiError } from "@/lib/options";
import { FULL_FORM, normalizeConfig, type ProgramFormConfig } from "@/lib/program-form/rules";
import type { Session } from "@/lib/auth";

type SupabaseServer = Session["supabase"];

export async function loadProgramFormConfig(supabase: SupabaseServer, programId: string): Promise<ProgramFormConfig> {
  const { data, error } = await supabase.from("program_form_config").select("report_parts, ask_themes").eq("program_id", programId).maybeSingle();
  if (error) throw toApiError(error);
  return data ? normalizeConfig(data) : FULL_FORM;
}

export async function loadAllProgramFormConfigs(supabase: SupabaseServer): Promise<Record<string, ProgramFormConfig>> {
  const { data, error } = await supabase.from("program_form_config").select("program_id, report_parts, ask_themes");
  if (error) throw toApiError(error);
  return Object.fromEntries((data ?? []).map((r: { program_id: string; report_parts: string[]; ask_themes: boolean }) => [r.program_id, normalizeConfig(r)]));
}
