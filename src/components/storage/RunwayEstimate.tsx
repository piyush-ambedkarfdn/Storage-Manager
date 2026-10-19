"use client";

import { formatBytes } from "@/components/storage/StorageOverview";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import type { ProviderUsage } from "@/types/storage";

/** "At last month's pace the space lasts about N months", from the last 30 days of uploads. */
export function RunwayEstimate({ usage, bytesLast30, blockPct }: { usage: ProviderUsage; bytesLast30: number; blockPct: number }) {
  const t = useT(cleanupMessages);
  if (!usage.limitBytes) return null;
  // space left before uploads pause
  const free = (usage.limitBytes * blockPct) / 100 - usage.usedBytes;
  let text: string;
  if (free <= 0) text = t("runwayFull");
  else if (bytesLast30 < 5_000_000) text = t("runwaySlow");
  else text = t("runway", { perMonth: formatBytes(bytesLast30), months: Math.max(0, Math.floor(free / bytesLast30)) });
  return (
    <p className="text-sm">
      <span className="font-semibold">{t("runwayTitle")}: </span>
      {text}
    </p>
  );
}
