"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ColorChip } from "@/components/shared/ColorChip";
import { useOptions } from "@/hooks/useOptions";
import { addDays, isoDate } from "@/lib/days/upcoming";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { ContentItem } from "@/types/content";
import type { UpcomingDay } from "@/types/days";

const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_HI = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"];

/** Mon-first weeks covering the month. */
function gridDates(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = isoDate(new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7)));
  const last = new Date(y, m, 0);
  const cells = Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDays(start, i));
}

/**
 * Month view. Drag a post to another day to reschedule (mouse; on touch use the date field in the post).
 * Days to plan around are marked in their cells.
 */
export function CalendarMonthView({
  month,
  items,
  days,
  hindi,
  patch,
  onOpen,
  onNew,
}: {
  month: string;
  items: ContentItem[];
  days: UpcomingDay[];
  hindi: boolean;
  patch: (id: string, fields: Partial<ContentItem>) => Promise<void>;
  onOpen: (id: string) => void;
  onNew: (date: string) => void;
}) {
  const t = useT(calendarMessages);
  const locale = useLocale();
  const { allOptions: statuses } = useOptions("status");
  const [over, setOver] = useState<string | null>(null);
  const today = isoDate(new Date());
  const dates = gridDates(month);
  const statusColor = (s: string) => statuses.find((o) => o.value === s)?.color ?? "#7A8AA3";

  async function drop(date: string, id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || item.publish_date === date) return;
    try {
      await patch(id, { publish_date: date });
      toast.success(t("moved", { date }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <p className="px-3 pt-2 text-xs text-muted-foreground">{t("dragHint")}</p>
      <div className="grid min-w-[760px] grid-cols-7">
        {(locale === "hi" ? WEEKDAYS_HI : WEEKDAYS_EN).map((d) => (
          <div key={d} className="border-b px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {dates.map((date) => {
          const inMonth = date.startsWith(month);
          const dayItems = items.filter((i) => i.publish_date === date);
          const marks = days.filter((d) => d.date === date);
          return (
            <div
              key={date}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(date);
              }}
              onDragLeave={() => setOver((o) => (o === date ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                void drop(date, e.dataTransfer.getData("text/plain"));
              }}
              className={cn(
                "group flex min-h-28 flex-col gap-1 border-r border-b p-1.5",
                !inMonth && "bg-secondary/40 text-muted-foreground",
                over === date && "bg-primary/10",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", date === today && "bg-primary text-primary-foreground")}>
                  {Number(date.slice(8))}
                </span>
                <button
                  type="button"
                  onClick={() => onNew(date)}
                  className="grid size-6 place-items-center rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-secondary"
                  aria-label={`${t("newItem")} ${date}`}
                >
                  <Plus className="size-3.5" aria-hidden />
                </button>
              </div>
              {marks.map((m) => (
                <span key={m.key} className="truncate rounded bg-marigold/15 px-1 text-[11px] font-semibold text-marigold-ink" title={m.name}>
                  {hindi && m.nameHi ? m.nameHi : m.name}
                </span>
              ))}
              {dayItems.slice(0, 4).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", i.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onOpen(i.id)}
                  className="flex cursor-grab flex-col items-start gap-0.5 rounded border bg-background px-1.5 py-1 text-left text-xs hover:border-primary active:cursor-grabbing"
                >
                  <span className="w-full truncate font-semibold">{i.title}</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {i.platform ? <span className="text-muted-foreground">{i.platform}</span> : null}
                    <ColorChip color={statusColor(i.status)} label={i.status} />
                  </span>
                </button>
              ))}
              {dayItems.length > 4 ? <span className="text-xs text-muted-foreground">{t("more", { n: dayItems.length - 4 })}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
