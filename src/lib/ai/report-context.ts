import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { activityLabel } from "@/config/activity-types";
import { redactReport } from "@/lib/ai/redact";
import { staffNames } from "@/lib/ai/org-context";
import { REPORT_PART_KEYS, type ReportParts } from "@/types/report";

type Named = { name: string | null } | null;

export type ThemeRef = { code: string; id: string; name: string };

/** Problem themes with short codes (T1, T2…) so the model never has to copy long ids. */
export async function themeList(): Promise<ThemeRef[]> {
  const { data } = await createAdminClient().from("calendar_options").select("id, value").eq("type", "theme").eq("hidden", false).order("sort_order");
  return (data ?? []).map((t, i) => ({ code: `T${i + 1}`, id: t.id as string, name: t.value as string }));
}

export function themeCodesToIds(codes: string[], themes: ThemeRef[]): string[] {
  return [...new Set(codes.map((c) => themes.find((t) => t.code === c.trim())?.id).filter((x): x is string => !!x))].slice(0, 3);
}

/** The staff report as redacted text, the four answers labelled. */
export function reportText(parts: Partial<ReportParts> | null, joined: string | null, names: string[]): string {
  const labels: Record<string, string> = {
    what_happened: "What happened",
    problem: "The problem",
    who_affected: "Who was affected",
    result: "The result",
  };
  const body = parts
    ? REPORT_PART_KEYS.filter((k) => parts[k]?.trim()).map((k) => `${labels[k]}: ${parts[k]!.trim()}`).join("\n")
    : (joined ?? "");
  return redactReport(body, { knownNames: names });
}

export type ReportForPrompt = {
  code: string;
  id: string;
  text: string;
  place: string;
  activity: string;
  date: string | null;
  themes: string[];
  program: string | null;
};

const REPORT_SELECT =
  "id, report, report_parts, ai_report_en, ai_review_status, theme_ids, activity_type, event_date, program:programs(name), district:districts(name), panchayat:panchayats(name), village:villages(name)";

type ReportRow = {
  id: string;
  report: string | null;
  report_parts: Partial<ReportParts> | null;
  ai_report_en: string | null;
  ai_review_status: string;
  theme_ids: string[];
  activity_type: string | null;
  event_date: string | null;
  program: Named;
  district: Named;
  panchayat: Named;
  village: Named;
};

async function shape(rows: ReportRow[]): Promise<ReportForPrompt[]> {
  const [names, themes] = await Promise.all([staffNames(), themeList()]);
  return rows.map((r, i) => ({
    code: `R${i + 1}`,
    id: r.id,
    // accepted AI text is preferred (an admin checked it); otherwise the staff text
    text:
      r.ai_review_status === "accepted" && r.ai_report_en
        ? redactReport(r.ai_report_en, { knownNames: names })
        : reportText(r.report_parts, r.report, names),
    place: [r.district?.name, r.panchayat?.name, r.village?.name].filter(Boolean).join(" / "),
    activity: activityLabel(r.activity_type),
    date: r.event_date,
    themes: r.theme_ids.map((id) => themes.find((t) => t.id === id)?.name).filter((x): x is string => !!x),
    program: r.program?.name ?? null,
  }));
}

/** Reports behind some photos, plus the photos' descriptions (for captions and briefs). */
export async function loadReportContext(photoIds: string[]): Promise<{ reports: ReportForPrompt[]; descriptions: string[] }> {
  if (!photoIds.length) return { reports: [], descriptions: [] };
  const admin = createAdminClient();
  const { data: photos } = await admin.from("photos").select("report_id, ai_description, consent").in("id", photoIds);
  const ids = [...new Set((photos ?? []).map((p) => p.report_id as string | null).filter((x): x is string => !!x))];
  const { data } = ids.length ? await admin.from("field_reports").select(REPORT_SELECT).in("id", ids) : { data: [] };
  return {
    reports: await shape((data ?? []) as unknown as ReportRow[]),
    descriptions: (photos ?? []).map((p) => p.ai_description as string | null).filter((x): x is string => !!x),
  };
}

/** Recent reports (for ideas and the month plan). */
export async function loadRecentReports(days = 60, max = 25): Promise<ReportForPrompt[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await createAdminClient()
    .from("field_reports")
    .select(REPORT_SELECT)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(max);
  return shape((data ?? []) as unknown as ReportRow[]);
}

export function reportsBlock(reports: ReportForPrompt[]): string {
  if (!reports.length) return "No field reports.";
  return reports
    .map((r) => `[${r.code}] ${r.date ?? "date unknown"} · ${r.activity} · ${r.place} · program: ${r.program ?? "—"} · themes: ${r.themes.join(", ") || "—"}\n${r.text}`)
    .join("\n\n");
}
