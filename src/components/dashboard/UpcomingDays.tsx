"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useDays } from "@/hooks/useDays";
import { addDays, isoDate } from "@/lib/days/upcoming";
import { useLocale, useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

/** The next 5 days to plan around. */
export function UpcomingDays() {
  const t = useT(dashboardMessages);
  const tc = useT(calendarMessages);
  const locale = useLocale();
  const from = isoDate(new Date());
  const { days } = useDays(from, addDays(from, 90));
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-base font-semibold">{t("daysTitle")}</h2>
      <ul className="divide-y">
        {days.slice(0, 5).map((d) => (
          <li key={`${d.key}${d.date}`} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span>
              <b>{format(new Date(d.date), "d MMM")}</b> {locale === "hi" && d.nameHi ? d.nameHi : d.name}
            </span>
            <span className="text-xs text-muted-foreground">{tc(`scope_${d.scope}`)}</span>
          </li>
        ))}
      </ul>
      <Link href="/admin/calendar" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
        {t("seeCalendar")}
      </Link>
    </section>
  );
}
