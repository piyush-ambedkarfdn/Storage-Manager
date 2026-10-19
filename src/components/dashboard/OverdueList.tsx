"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import type { ContentItem } from "@/types/content";

/** Posts whose date has passed while their status is not yet one that "protects photos" (Scheduled, Published). */
export function OverdueList({ items }: { items: ContentItem[] }) {
  const t = useT(dashboardMessages);
  if (!items.length) return null;
  return (
    <div>
      <h2 className="mt-4 mb-1 text-base font-semibold text-destructive">{t("overdue", { n: items.length })}</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/admin/calendar?month=${i.publish_date?.slice(0, 7)}`} className="hover:underline">
              {i.title}
            </Link>{" "}
            · <span className="text-muted-foreground">{t("wasDue", { date: i.publish_date ? format(new Date(i.publish_date), "d MMM") : "" })}</span> ·{" "}
            <i>{i.production_stage}</i>
          </li>
        ))}
      </ul>
    </div>
  );
}
