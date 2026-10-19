import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { APP } from "@/config/app";
import { toApiError } from "@/lib/options";
import { storageSettingsSchema } from "@/lib/schemas/cleanup";
import type { StorageSettings, UploadRate } from "@/types/cleanup";

/** GET (admin): limits and thresholds, and how much was uploaded per storage in the last 30 days. */
export const GET = handle(async () => {
  const { supabase } = await assertAdmin();
  const [{ data }, { data: rate, error }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "storage").maybeSingle(),
    supabase.rpc("upload_rate", { p_days: 30 }),
  ]);
  if (error) throw toApiError(error);
  const d = APP.storageDefaults;
  const v = (data?.value ?? {}) as Partial<StorageSettings>;
  const settings: StorageSettings = {
    limit_bytes: v.limit_bytes ?? d.limitBytes,
    warn_pct: v.warn_pct ?? d.warnPct,
    amber_pct: v.amber_pct ?? d.amberPct,
    block_pct: v.block_pct ?? d.blockPct,
    trash_days: v.trash_days ?? d.trashDays,
  };
  const rates = ((rate ?? []) as { provider: UploadRate["provider"]; bytes: number; photos: number }[]).map((r) => ({
    provider: r.provider,
    bytes: Number(r.bytes),
    photos: Number(r.photos),
  }));
  return { settings, rate30: rates };
});

/** PUT { limit_gb, warn_pct, amber_pct, block_pct, trash_days } (admin). STORAGE_LIMIT_BYTES in env still wins for R2. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const v = await parseBody(storageSettingsSchema, req);
  const value: StorageSettings = {
    limit_bytes: Math.round(v.limit_gb * 1_000_000_000),
    warn_pct: v.warn_pct,
    amber_pct: v.amber_pct,
    block_pct: v.block_pct,
    trash_days: v.trash_days,
  };
  const { error } = await supabase.from("app_settings").upsert({ key: "storage", value });
  if (error) throw toApiError(error);
  await logActivity({ action: "option_changed", entityType: "storage_settings", detail: value });
  return { settings: value };
});
