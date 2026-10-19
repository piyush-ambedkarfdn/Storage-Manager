"use client";

import { RunwayEstimate } from "@/components/storage/RunwayEstimate";
import { UsageMeter as Meter } from "@/components/storage/StorageOverview";
import { ColorChip } from "@/components/shared/ColorChip";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import { storageMessages } from "@/lib/i18n/messages/storage";
import type { ProviderUsage, StorageThresholds } from "@/types/storage";

/**
 * One storage as a card: meter with the 70/85/95 marks (R2 against its limit, Drive against the
 * Google account's quota), photo counts by status, and the runway estimate.
 */
export function ProviderUsageCard({ usage, thresholds, bytesLast30 }: { usage: ProviderUsage; thresholds: StorageThresholds; bytesLast30: number }) {
  const t = useT(cleanupMessages);
  const ts = useT(storageMessages);
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{ts(usage.provider)}</h2>
        {usage.active ? <ColorChip color="var(--success)" label={ts("activeBadge")} /> : null}
      </div>
      {usage.configured ? (
        <>
          <Meter usage={usage} thresholds={thresholds} />
          <p className="text-xs text-muted-foreground">
            {t("photosCount", { active: usage.activeCount, trashed: usage.trashedCount, archived: usage.archivedCount })}
          </p>
          {usage.active ? <RunwayEstimate usage={usage} bytesLast30={bytesLast30} blockPct={thresholds.blockPct} /> : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{ts("notSetUp")}</p>
      )}
    </section>
  );
}
