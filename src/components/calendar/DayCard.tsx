"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { DayScope, UpcomingDay } from "@/types/days";

export const SCOPE_COLOR: Record<DayScope, string> = {
  national: "var(--primary)",
  international: "var(--marigold-ink)",
  local: "var(--success)",
};

/** One day to plan around: date, name (Hindi or English), scope, Plan a post, Hide / Edit / Delete. */
export function DayCard({
  day,
  hindi,
  onPlan,
  onToggleHidden,
  onEdit,
  onDelete,
}: {
  day: UpcomingDay;
  hindi: boolean;
  onPlan: (d: UpcomingDay) => void;
  onToggleHidden: (d: UpcomingDay) => void;
  onEdit: (d: UpcomingDay) => void;
  onDelete: (d: UpcomingDay) => void;
}) {
  const t = useT(calendarMessages);
  const name = hindi && day.nameHi ? day.nameHi : day.name;
  return (
    <li className={cn("flex flex-col gap-1.5 rounded-md border p-2.5", day.hidden && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">{format(new Date(day.date), "d MMM")}</b>
        <ColorChip color={SCOPE_COLOR[day.scope]} label={day.hidden ? t("hidden") : t(`scope_${day.scope}`)} />
      </div>
      <div className="text-sm" lang={hindi && day.nameHi ? "hi" : undefined}>
        {name}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="min-h-8 border-primary text-primary" onClick={() => onPlan(day)}>
          {t("planPost")}
        </Button>
        {day.source === "builtin" ? (
          <Button size="sm" variant="ghost" className="min-h-8 text-muted-foreground" onClick={() => onToggleHidden(day)}>
            {day.hidden ? t("show") : t("hide")}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" className="min-h-8" onClick={() => onEdit(day)}>
              {t("edit")}
            </Button>
            <Button size="sm" variant="ghost" className="min-h-8 text-destructive" onClick={() => onDelete(day)}>
              {t("delete")}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
