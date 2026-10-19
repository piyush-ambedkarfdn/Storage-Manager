"use client";

import { useT } from "@/lib/i18n/provider";
import { aiMessages } from "@/lib/i18n/messages/ai";
import type { UsageToday } from "@/lib/ai/throttle";

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="h-2.5 rounded-full bg-secondary" role="meter" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit}>
      <div className={`h-2.5 rounded-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-marigold" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Today's use of the free-tier budget per model, and the privacy note. */
export function AiUsageCard({ usage, ready }: { usage: UsageToday; ready: boolean }) {
  const t = useT(aiMessages);
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{t("usageTitle")}</h2>
      {!ready ? <p className="rounded-md border border-marigold bg-marigold/15 px-3 py-2 text-sm">{t("notReady")}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(["flash", "lite"] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <code className="text-xs">{t("usageModel", { model: usage[k].model })}</code>
              <b className="tabular-nums">{t("usageOf", { used: usage[k].used, limit: usage[k].limit })}</b>
            </div>
            <Meter used={usage[k].used} limit={usage[k].limit} />
            <p className="text-xs text-muted-foreground">{k === "flash" ? t("usageFlashHint") : t("usageLiteHint")}</p>
          </div>
        ))}
      </div>
      <p className="text-sm">{t("usageRpm", { n: usage.rpm.lastMinute, limit: usage.rpm.limit })}</p>
      <p className="text-xs text-muted-foreground">{t("usageResets")}</p>
      <div className="rounded-md border bg-secondary/40 p-3 text-sm">
        <h3 className="font-semibold">{t("privacyTitle")}</h3>
        <p>{t("privacyBody")}</p>
      </div>
    </section>
  );
}
