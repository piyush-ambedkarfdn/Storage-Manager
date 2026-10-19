import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { AWARENESS_DAYS } from "@/config/awareness-days";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadReportContext, reportsBlock } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { daysSchema } from "@/lib/ai/schemas";
import { addDays, isoDate, upcomingDays } from "@/lib/days/upcoming";
import type { CustomDay } from "@/types/days";

export const maxDuration = 60;

/**
 * POST { photoIds?, title?, from?, to? } (admin): days (including moving festivals) that fit the post.
 * Tries Google Search grounding first; if the free tier does not allow it, answers without search and
 * marks every date "check the date".
 */
export const POST = handle(async (req) => {
  assertAiReady();
  const { supabase } = await assertAdmin();
  const body = await parseBody(
    z.object({
      photoIds: z.array(z.uuid()).max(50).default([]),
      title: z.string().max(200).default(""),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
    }),
    req,
  );
  const from = body.from ?? isoDate(new Date());
  const to = body.to ?? addDays(from, 90);
  const [{ data: customs }, { data: hidden }, ctx] = await Promise.all([
    supabase.from("custom_days").select("id, name, name_hi, month, day, year, scope, tags, note"),
    supabase.from("app_settings").select("value").eq("key", "hidden_days").maybeSingle(),
    loadReportContext(body.photoIds),
  ]);
  const known = upcomingDays(from, to, AWARENESS_DAYS, (customs ?? []) as CustomDay[], Array.isArray(hidden?.value) ? (hidden.value as string[]) : []);
  const input = `Date range: ${from} to ${to}\nPost title: ${body.title || "—"}\n\nKnown days in range:\n${known.map((d) => `${d.date} ${d.name} (${d.scope}; ${d.tags.join(", ")})`).join("\n") || "—"}\n\nField reports:\n${reportsBlock(ctx.reports)}`;
  const sys = await system(TASKS.days);

  try {
    const { data } = await generateJson({ kind: "flash", purpose: "days", system: sys, input, schema: daysSchema, googleSearch: true });
    return { days: data.days, grounded: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) throw err;
    const { data } = await generateJson({ kind: "flash", purpose: "days", system: sys, input, schema: daysSchema });
    return { days: data.days.map((d) => ({ ...d, needsDateCheck: true })), grounded: false };
  }
});
