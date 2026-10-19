"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ColorChip } from "@/components/shared/ColorChip";
import { useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import type { ContentItem } from "@/types/content";

export function UpcomingList({ items }: { items: ContentItem[] }) {
  const t = useT(dashboardMessages);
  const { allOptions } = useOptions("status");
  const color = (s: string) => allOptions.find((o) => o.value === s)?.color ?? "#7A8AA3";
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold">{t("next7")}</h2>
      {!items.length ? <p className="text-sm text-muted-foreground">{t("nothingNext")}</p> : null}
      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <Link href={`/admin/calendar?month=${i.publish_date?.slice(0, 7)}`} className="min-w-0 truncate hover:underline">
              <b className="text-muted-foreground">{i.publish_date ? format(new Date(i.publish_date), "d MMM") : ""}</b> · {i.title}
            </Link>
            <ColorChip color={color(i.status)} label={i.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
