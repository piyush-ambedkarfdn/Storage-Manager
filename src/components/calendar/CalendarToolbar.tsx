"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ManageOptionsDialog } from "@/components/settings/ManageOptionsDialog";
import { isEnabled } from "@/config/features";
import { useOptions } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

const ALL = "__all__";

/** Month navigation, Table / Month, platform and status filters, Manage options, Ideas (AI), New item. */
export function CalendarToolbar({
  monthLabel,
  view,
  onView,
  onMonth,
  platform,
  status,
  onFilter,
  onNew,
  onIdeas,
}: {
  monthLabel: string;
  view: "table" | "month";
  onView: (v: "table" | "month") => void;
  onMonth: (delta: -1 | 0 | 1) => void;
  platform: string | undefined;
  status: string | undefined;
  onFilter: (f: { platform?: string; status?: string }) => void;
  onNew: () => void;
  onIdeas: () => void;
}) {
  const t = useT(calendarMessages);
  const { options: platforms } = useOptions("platform");
  const { options: statuses } = useOptions("status");
  const [manage, setManage] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-10" onClick={() => onMonth(-1)} aria-label={t("prevMonth")}>
          <ChevronLeft aria-hidden />
        </Button>
        <span className="min-w-36 text-center font-semibold">{monthLabel}</span>
        <Button variant="outline" size="icon" className="size-10" onClick={() => onMonth(1)} aria-label={t("nextMonth")}>
          <ChevronRight aria-hidden />
        </Button>
        <Button variant="ghost" className="min-h-10" onClick={() => onMonth(0)}>
          {t("today")}
        </Button>
      </div>
      <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border">
        {(["table", "month"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => onView(v)} className={cn("min-h-10 px-3 text-sm", view === v ? "bg-secondary font-semibold" : "bg-card")}>
            {v === "table" ? t("viewTable") : t("viewMonth")}
          </button>
        ))}
      </div>
      <Select value={platform ?? ALL} onValueChange={(v) => onFilter({ platform: v === ALL ? undefined : v, status })}>
        <SelectTrigger className="h-10 w-40" aria-label={t("platform")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allPlatforms")}</SelectItem>
          {platforms.map((o) => (
            <SelectItem key={o.id} value={o.value}>
              {o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status ?? ALL} onValueChange={(v) => onFilter({ platform, status: v === ALL ? undefined : v })}>
        <SelectTrigger className="h-10 w-40" aria-label={t("status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
          {statuses.map((o) => (
            <SelectItem key={o.id} value={o.value}>
              {o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex-1" />
      <Button variant="outline" className="min-h-10" onClick={() => setManage(true)}>
        <Settings2 aria-hidden /> {t("manageOptions")}
      </Button>
      {isEnabled("ai") ? (
        <Button variant="outline" className="min-h-10 text-primary" onClick={onIdeas}>
          <Sparkles aria-hidden /> {t("ideas")}
        </Button>
      ) : null}
      <Button className="min-h-10" onClick={onNew}>
        <Plus aria-hidden /> {t("newItem")}
      </Button>
      {manage ? <ManageOptionsDialog type="status" open onOpenChange={setManage} /> : null}
    </div>
  );
}
