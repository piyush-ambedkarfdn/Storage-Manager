"use client";

import { ACTIVITY_TYPES, type ActivityType } from "@/config/activity-types";
import { Bars } from "@/components/dashboard/PlatformBars";
import { useLocale, useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";

export function ActivityBars({ counts }: { counts: Record<string, number> }) {
  const t = useT(dashboardMessages);
  const locale = useLocale();
  const rows = (ACTIVITY_TYPES as readonly ActivityType[])
    .filter((a) => !a.retired || (counts[a.id] ?? 0) > 0)
    .map((a) => ({ label: locale === "hi" ? a.labelHi : a.label, value: counts[a.id] ?? 0, color: a.color }));
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">{t("byActivity")}</h2>
      <Bars rows={rows} />
    </section>
  );
}
