import "server-only";
import { ApiError } from "@/lib/api";
import { optionalEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveProviderName, getProvider } from "@/lib/storage";
import { APP } from "@/config/app";
import { PROVIDER_NAMES, type ProviderName, type ProviderUsage, type StorageThresholds, type UsageLevel, type UsageResponse } from "@/types/storage";

/**
 * Free-tier guard. R2 usage is summed in Postgres (never by listing the bucket); Drive usage is the
 * Google account's real quota (shared with Gmail). Warn at 70%, banner at 85%, block uploads at 95%
 * of the ACTIVE storage. Thresholds and the R2 limit come from app_settings 'storage'; STORAGE_LIMIT_BYTES overrides the limit.
 */

type StorageSettings = { limit_bytes?: number; warn_pct?: number; amber_pct?: number; block_pct?: number };

async function settings(): Promise<{ limitBytes: number; thresholds: StorageThresholds }> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "storage").maybeSingle();
  const s = (data?.value ?? {}) as StorageSettings;
  const envLimit = Number(optionalEnv("STORAGE_LIMIT_BYTES"));
  return {
    limitBytes: Number.isFinite(envLimit) && envLimit > 0 ? envLimit : (s.limit_bytes ?? APP.storageDefaults.limitBytes),
    thresholds: {
      warnPct: s.warn_pct ?? APP.storageDefaults.warnPct,
      amberPct: s.amber_pct ?? APP.storageDefaults.amberPct,
      blockPct: s.block_pct ?? APP.storageDefaults.blockPct,
    },
  };
}

function levelFor(pct: number | null, t: StorageThresholds): UsageLevel {
  if (pct === null) return "ok";
  if (pct >= t.blockPct) return "block";
  if (pct >= t.amberPct) return "amber";
  if (pct >= t.warnPct) return "warn";
  return "ok";
}

// Drive's quota call is slow-ish; remember it for a few minutes per server instance.
let driveQuotaCache: { at: number; value: { usedBytes: number; limitBytes: number | null } | null } | null = null;
async function driveQuota() {
  if (driveQuotaCache && Date.now() - driveQuotaCache.at < 5 * 60_000) return driveQuotaCache.value;
  let value: { usedBytes: number; limitBytes: number | null } | null = null;
  try {
    value = await getProvider("gdrive").quota();
  } catch {
    value = null;
  }
  driveQuotaCache = { at: Date.now(), value };
  return value;
}

export async function getUsage(): Promise<UsageResponse> {
  const supabase = await createClient();
  const [{ limitBytes, thresholds }, active, { data: rows }] = await Promise.all([
    settings(),
    getActiveProviderName(),
    supabase.rpc("storage_usage"),
  ]);
  const byProvider = new Map(
    ((rows ?? []) as { provider: ProviderName; used_bytes: number; active_count: number; trashed_count: number; archived_count: number }[]).map(
      (r) => [r.provider, r],
    ),
  );

  const providers: ProviderUsage[] = [];
  for (const name of PROVIDER_NAMES) {
    const row = byProvider.get(name);
    const configured = await getProvider(name).isConfigured();
    const appBytes = Number(row?.used_bytes ?? 0);
    let usedBytes = appBytes;
    let limit: number | null = limitBytes;
    if (name === "gdrive") {
      const q = configured ? await driveQuota() : null;
      usedBytes = q?.usedBytes ?? appBytes;
      limit = q?.limitBytes ?? null;
    }
    const pct = limit ? Math.round((usedBytes / limit) * 1000) / 10 : null;
    providers.push({
      provider: name,
      active: name === active,
      configured,
      appBytes,
      usedBytes,
      limitBytes: limit,
      pct,
      level: levelFor(pct, thresholds),
      activeCount: Number(row?.active_count ?? 0),
      trashedCount: Number(row?.trashed_count ?? 0),
      archivedCount: Number(row?.archived_count ?? 0),
    });
  }
  return { providers, thresholds, active };
}

/** Throws 507 when this upload would take the active storage past the block threshold. */
export async function assertCanUpload(bytes: number): Promise<ProviderName> {
  const usage = await getUsage();
  const active = usage.providers.find((p) => p.active)!;
  if (!active.configured) {
    throw new ApiError(503, "Photo storage is not set up yet. Ask an admin to finish the Storage settings.");
  }
  if (active.limitBytes) {
    const after = ((active.usedBytes + bytes) / active.limitBytes) * 100;
    if (after >= usage.thresholds.blockPct) {
      throw new ApiError(507, "Photo storage is almost full, so uploads are paused. Your photos are kept on this phone. Ask an admin to free space.");
    }
  }
  return active.provider;
}
