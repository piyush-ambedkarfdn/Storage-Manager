"use client";

import { useStorageUsage } from "@/hooks/useStorageUsage";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { storageMessages } from "@/lib/i18n/messages/storage";
import type { ProviderUsage, StorageThresholds } from "@/types/storage";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

/** One storage's usage bar with the 70 / 85 / 95 % marks. Status is said in words, not only colour. */
export function UsageMeter({ usage, thresholds }: { usage: ProviderUsage; thresholds: StorageThresholds }) {
  const t = useT(storageMessages);
  const pct = Math.min(usage.pct ?? 0, 100);
  const bar = usage.level === "block" ? "bg-destructive" : usage.level === "amber" ? "bg-marigold" : usage.level === "warn" ? "bg-marigold/70" : "bg-primary";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span>
          {usage.limitBytes
            ? t("usage", { used: formatBytes(usage.usedBytes), limit: formatBytes(usage.limitBytes) })
            : t("usageNoLimit", { used: formatBytes(usage.usedBytes) })}
        </span>
        {usage.pct !== null ? <b className="tabular-nums">{usage.pct}%</b> : null}
      </div>
      <div
        className="relative h-2.5 rounded-full bg-secondary"
        role="meter"
        aria-valuenow={usage.pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t(usage.provider)}
      >
        <div className={cn("h-2.5 rounded-full", bar)} style={{ width: `${pct}%` }} />
        {[thresholds.warnPct, thresholds.amberPct, thresholds.blockPct].map((m) => (
          <span key={m} aria-hidden className="absolute top-0 h-2.5 w-px bg-foreground/40" style={{ left: `${m}%` }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("appPhotos", { bytes: formatBytes(usage.appBytes), n: usage.activeCount })}
        {usage.provider === "gdrive" ? ` ${t("driveWholeAccount")}` : ""}
      </p>
      {usage.level !== "ok" ? (
        <p className={cn("text-sm font-semibold", usage.level === "block" ? "text-destructive" : "text-marigold-ink")}>
          {usage.level === "block"
            ? t("levelBlock", { pct: thresholds.blockPct })
            : usage.level === "amber"
              ? t("levelAmber", { pct: thresholds.amberPct })
              : t("levelWarn", { pct: thresholds.warnPct })}
        </p>
      ) : null}
    </div>
  );
}

/** Usage of both storages side by side. */
export function StorageOverview() {
  const t = useT(storageMessages);
  const { data } = useStorageUsage();
  if (!data) return null;
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {data.providers.map((p) => (
        <div key={p.provider} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">{t(p.provider)}</h2>
          {p.configured ? <UsageMeter usage={p} thresholds={data.thresholds} /> : <p className="text-sm text-muted-foreground">{t("notSetUp")}</p>}
        </div>
      ))}
    </section>
  );
}
