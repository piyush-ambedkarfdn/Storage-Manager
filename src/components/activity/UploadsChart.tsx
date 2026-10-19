"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { activityMessages } from "@/lib/i18n/messages/activity";
import type { DayCount } from "@/types/activity-view";

/** Bars per day with the number on each, plus a table view for screen readers and exact reading. */
export function UploadsChart({ days }: { days: DayCount[] }) {
  const t = useT(activityMessages);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...days.map((d) => d.photos));
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("chartTitle", { n: days.length })}</h2>
        <Button variant="ghost" size="sm" onClick={() => setTable((x) => !x)} aria-pressed={table}>
          {t("chartTable")}
        </Button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">{t("day")}</th>
              <th className="py-1 text-right">{t("photos")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t">
                <td className="py-1">{format(new Date(d.day), "EEE d MMM")}</td>
                <td className="py-1 text-right tabular-nums">{d.photos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex h-40 items-end gap-1" aria-hidden>
          {days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] tabular-nums text-muted-foreground">{d.photos || ""}</span>
              <div className="w-full rounded-t bg-primary" style={{ height: `${(d.photos / max) * 100}%`, minHeight: d.photos ? 3 : 1, opacity: d.photos ? 1 : 0.25 }} />
              <span className="text-[10px] text-muted-foreground">{format(new Date(d.day), "d")}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
