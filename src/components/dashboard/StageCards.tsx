"use client";

import { useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";

/** One card per production stage (in the admin's order), with the stage colour and the count. */
export function StageCards({ byStage }: { byStage: { stage: string; total: number }[] }) {
  const t = useT(dashboardMessages);
  const { options } = useOptions("stage");
  const count = (s: string) => byStage.find((x) => x.stage === s)?.total ?? 0;
  return (
    <section aria-label={t("stages")} className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
      {options.map((o) => (
        <div key={o.id} className="rounded-lg border border-t-4 bg-card px-4 py-3" style={{ borderTopColor: o.color ?? "#7A8AA3" }}>
          <div className="text-3xl leading-tight font-bold tabular-nums">{count(o.value)}</div>
          <div className="text-sm text-muted-foreground">{o.value}</div>
        </div>
      ))}
    </section>
  );
}
