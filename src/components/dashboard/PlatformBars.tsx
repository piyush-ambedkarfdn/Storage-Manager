"use client";

import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";

/** Horizontal bars with the number written beside each (never colour or length alone). */
export function Bars({ rows, color = "var(--primary)", labelWidth = "w-28" }: { rows: { label: string; value: number; color?: string }[]; color?: string; labelWidth?: string }) {
  const t = useT(dashboardMessages);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className={`${labelWidth} shrink-0 truncate`} title={r.label}>
            {r.label}
          </span>
          <span className="h-2.5 flex-1 rounded-full bg-secondary">
            <span className="block h-2.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color ?? color }} />
          </span>
          <b className="w-10 text-right tabular-nums">{r.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function PlatformBars({ byPlatform }: { byPlatform: { platform: string; total: number }[] }) {
  const t = useT(dashboardMessages);
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">{t("byPlatform")}</h2>
      <Bars rows={byPlatform.map((p) => ({ label: p.platform, value: p.total }))} />
    </section>
  );
}
