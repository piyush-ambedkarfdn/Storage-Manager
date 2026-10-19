import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { AWARENESS_DAYS } from "@/config/awareness-days";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadRecentReports, reportsBlock } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { monthPlanSchema } from "@/lib/ai/schemas";
import { upcomingDays } from "@/lib/days/upcoming";
import type { CustomDay } from "@/types/days";

export const maxDuration = 60;

/** POST { month } (admin): a proposed plan for the month. Nothing is saved; the admin adds what they like. */
export const POST = handle(async (req) => {
  assertAiReady();
  const { supabase } = await assertAdmin();
  const { month } = await parseBody(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }), req);
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  const [{ data: customs }, { data: hidden }, reports] = await Promise.all([
    supabase.from("custom_days").select("id, name, name_hi, month, day, year, scope, tags, note"),
    supabase.from("app_settings").select("value").eq("key", "hidden_days").maybeSingle(),
    loadRecentReports(60, 20),
  ]);
  const days = upcomingDays(from, to, AWARENESS_DAYS, (customs ?? []) as CustomDay[], Array.isArray(hidden?.value) ? (hidden.value as string[]) : []);
  const { data, model, fellBack } = await generateJson({
    kind: "flash",
    purpose: "month-plan",
    system: await system(TASKS.monthPlan(month)),
    input: `Days to plan around:\n${days.map((d) => `${d.date} ${d.name} (${d.scope})`).join("\n") || "—"}\n\nField reports:\n${reportsBlock(reports)}`,
    schema: monthPlanSchema,
  });
  return { items: data.items.filter((i) => i.date >= from && i.date <= to), model, fellBack };
});
