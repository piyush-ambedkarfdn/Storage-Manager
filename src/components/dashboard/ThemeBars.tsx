"use client";

import { Bars } from "@/components/dashboard/PlatformBars";
import { useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";

/** Field reports per problem theme, most reported first. */
export function ThemeBars({ counts }: { counts: Record<string, number> }) {
  const t = useT(dashboardMessages);
  const { allOptions } = useOptions("theme");
  const rows = allOptions
    .map((o) => ({ label: o.value, value: counts[o.id] ?? 0, color: o.color ?? "var(--marigold-ink)" }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">{t("byTheme")}</h2>
      <Bars rows={rows} labelWidth="w-44" />
    </section>
  );
}
