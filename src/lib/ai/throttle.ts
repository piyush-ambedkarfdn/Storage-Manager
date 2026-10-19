import "server-only";
import { ApiError } from "@/lib/api";
import { optionalEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP } from "@/config/app";

/**
 * Free-tier budgets. Every Gemini call is logged as activity_log 'ai_used' with detail.model; today's
 * use is counted from there (day boundary Asia/Kolkata), so no extra table is needed.
 * "flash" = GEMINI_MODEL (small daily allowance), "lite" = GEMINI_MODEL_LITE (large daily allowance).
 * When Flash is used up, writing tasks fall back to Lite; when both are used up, calls are refused politely.
 */

export type ModelKind = "flash" | "lite";

export function modelName(kind: ModelKind): string {
  return kind === "flash"
    ? (optionalEnv("GEMINI_MODEL") ?? "gemini-3.8-flash")
    : (optionalEnv("GEMINI_MODEL_LITE") ?? "gemini-3.5-flash-lite");
}

function limit(kind: ModelKind): number {
  const raw = Number(optionalEnv(kind === "flash" ? "GEMINI_DAILY_LIMIT" : "GEMINI_DAILY_LIMIT_LITE"));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return kind === "flash" ? APP.aiFreeTier.dailyLimitFlash : APP.aiFreeTier.dailyLimitLite;
}

function rpmLimit(): number {
  const raw = Number(optionalEnv("GEMINI_RPM"));
  return Number.isFinite(raw) && raw > 0 ? raw : APP.aiFreeTier.requestsPerMinute;
}

/** Midnight in India (UTC+5:30), as an ISO string. */
function startOfTodayIndia(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  const midnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000;
  return new Date(midnightIst).toISOString();
}

async function countSince(since: string, model?: string): Promise<number> {
  let q = createAdminClient().from("activity_log").select("id", { count: "exact", head: true }).eq("action", "ai_used").gte("created_at", since);
  if (model) q = q.eq("detail->>model", model);
  const { count } = await q;
  return count ?? 0;
}

export type UsageToday = {
  flash: { model: string; used: number; limit: number };
  lite: { model: string; used: number; limit: number };
  rpm: { lastMinute: number; limit: number };
};

export async function getUsageToday(): Promise<UsageToday> {
  const since = startOfTodayIndia();
  const [flashUsed, liteUsed, lastMinute] = await Promise.all([
    countSince(since, modelName("flash")),
    countSince(since, modelName("lite")),
    countSince(new Date(Date.now() - 60_000).toISOString()),
  ]);
  return {
    flash: { model: modelName("flash"), used: flashUsed, limit: limit("flash") },
    lite: { model: modelName("lite"), used: liteUsed, limit: limit("lite") },
    rpm: { lastMinute, limit: rpmLimit() },
  };
}

/**
 * Picks the model for one call: the wanted one if its budget allows, else Lite (for Flash work),
 * else refuses with 429. Waits a little when the per-minute limit is reached.
 */
export async function reserveCall(kind: ModelKind): Promise<{ model: string; kind: ModelKind; fellBack: boolean }> {
  let usage = await getUsageToday();
  if (usage.rpm.lastMinute >= usage.rpm.limit) {
    await new Promise((r) => setTimeout(r, Math.ceil(60_000 / usage.rpm.limit)));
    usage = await getUsageToday();
    if (usage.rpm.lastMinute >= usage.rpm.limit) {
      throw new ApiError(429, "Many AI requests this minute (free tier). Try again in a minute.");
    }
  }
  if (kind === "flash" && usage.flash.used < usage.flash.limit) return { model: usage.flash.model, kind: "flash", fellBack: false };
  if (usage.lite.used < usage.lite.limit) return { model: usage.lite.model, kind: "lite", fellBack: kind === "flash" };
  throw new ApiError(429, "AI budget used for today (free tier). Try again tomorrow.");
}
