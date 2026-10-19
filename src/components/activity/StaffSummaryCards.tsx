"use client";

import { formatBytes } from "@/components/storage/StorageOverview";
import { useT } from "@/lib/i18n/provider";
import { activityMessages } from "@/lib/i18n/messages/activity";
import type { StaffStat } from "@/types/activity-view";

export function StaffSummaryCards({ s }: { s: StaffStat }) {
  const t = useT(activityMessages);
  const cards: [string, string][] = [
    [t("photosTotal"), s.photos_total.toLocaleString("en-IN")],
    [t("photosWeek"), s.photos_week.toLocaleString("en-IN")],
    [t("reports"), s.reports_total.toLocaleString("en-IN")],
    [t("storage"), formatBytes(s.storage_bytes)],
    [t("names"), s.names_suggested.toLocaleString("en-IN")],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card px-4 py-3">
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
