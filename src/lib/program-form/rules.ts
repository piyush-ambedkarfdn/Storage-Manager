import { REPORT_PART_KEYS, type ReportParts } from "@/types/report";

/**
 * Which questions a program's upload form asks. A program with no saved setting asks everything (as before).
 * Shared by the upload form (browser) and the report API (server), so both apply the same rules.
 */
export type ReportPartKey = (typeof REPORT_PART_KEYS)[number];
export type ProgramFormConfig = { report_parts: ReportPartKey[]; ask_themes: boolean };

export const FULL_FORM: ProgramFormConfig = { report_parts: [...REPORT_PART_KEYS], ask_themes: true };

/** A row of program_form_config (or nothing) → a config. Unknown question names are dropped. */
export function normalizeConfig(row: { report_parts?: string[] | null; ask_themes?: boolean | null } | null | undefined): ProgramFormConfig {
  if (!row) return FULL_FORM;
  const parts = (row.report_parts ?? []).filter((k): k is ReportPartKey => (REPORT_PART_KEYS as readonly string[]).includes(k));
  return { report_parts: REPORT_PART_KEYS.filter((k) => parts.includes(k)), ask_themes: row.ask_themes ?? true };
}

export type FormIssue = { field: "report" | "theme_ids"; message: string };

/** "What happened?" is required when it is asked; at least one problem theme is required when themes are asked. */
export function checkAgainstConfig(input: { report_parts: Partial<ReportParts>; theme_ids: string[] }, cfg: ProgramFormConfig): FormIssue[] {
  const issues: FormIssue[] = [];
  if (cfg.report_parts.includes("what_happened") && !input.report_parts.what_happened?.trim()) issues.push({ field: "report", message: "Write what happened." });
  if (cfg.ask_themes && input.theme_ids.length < 1) issues.push({ field: "theme_ids", message: "Pick at least one problem theme." });
  return issues;
}

/** What is saved: answers to questions the program does not ask are blanked, and themes are dropped when not asked. */
export function applyConfig(input: { report_parts: Partial<ReportParts>; theme_ids: string[] }, cfg: ProgramFormConfig): { report_parts: ReportParts; theme_ids: string[] } {
  const report_parts = { what_happened: "", problem: "", who_affected: "", result: "" } satisfies ReportParts;
  for (const k of cfg.report_parts) report_parts[k] = input.report_parts[k]?.trim() ?? "";
  return { report_parts, theme_ids: cfg.ask_themes ? input.theme_ids : [] };
}
