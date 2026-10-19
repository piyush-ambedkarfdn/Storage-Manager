"use client";

import { ActivityChip } from "@/components/shared/ActivityChip";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import { REPORT_PART_KEYS } from "@/types/report";
import type { ContentReport } from "@/types/content";

/** The field reports behind the attached photos: the accepted AI version if there is one, else what staff wrote. */
export function ReportContext({ reports }: { reports: ContentReport[] }) {
  const t = useT(calendarMessages);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t("reportsTitle")}</h3>
      {!reports.length ? <p className="text-sm text-muted-foreground">{t("noReports")}</p> : null}
      {reports.map((r) => {
        const accepted = r.ai_review_status === "accepted" && r.ai_report_en;
        return (
          <article key={r.id} className="rounded-md border bg-secondary/40 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <ActivityChip id={r.activity_type} />
              <span>{r.place_path}</span>
              <span>{r.event_date}</span>
              <span className="ml-auto font-semibold">{accepted ? t("acceptedAi") : t("staffText")}</span>
            </div>
            {accepted ? (
              <p className="whitespace-pre-line">{r.ai_report_en}</p>
            ) : r.report_parts ? (
              REPORT_PART_KEYS.filter((k) => r.report_parts?.[k]).map((k) => (
                <p key={k} className="whitespace-pre-line">
                  {r.report_parts?.[k]}
                </p>
              ))
            ) : (
              <p className="whitespace-pre-line">{r.report}</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
