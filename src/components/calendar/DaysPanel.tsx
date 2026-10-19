"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CustomDayDialog } from "@/components/calendar/CustomDayDialog";
import { DayCard } from "@/components/calendar/DayCard";
import { requestJson } from "@/hooks/useOptions";
import { useDays } from "@/hooks/useDays";
import { addDays, isoDate } from "@/lib/days/upcoming";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import { DAY_SCOPES, type CustomDay, type DayScope, type UpcomingDay } from "@/types/days";

/** Days to plan around: next 30/60/90 days, scope chips, Hindi names, hidden days, custom days. */
export function DaysPanel({ hindi, onHindi, onPlan }: { hindi: boolean; onHindi: (v: boolean) => void; onPlan: (d: UpcomingDay) => void }) {
  const t = useT(calendarMessages);
  const [range, setRange] = useState(60);
  const [scopes, setScopes] = useState<Set<DayScope>>(new Set(DAY_SCOPES));
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<CustomDay | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<UpcomingDay | null>(null);
  const from = isoDate(new Date());
  const { days, refresh } = useDays(from, addDays(from, range), showHidden);
  const shown = days.filter((d) => scopes.has(d.scope));

  async function toggleHidden(d: UpcomingDay) {
    try {
      await requestJson("/api/days/hidden", { method: "PUT", body: { id: d.key.replace("builtin:", ""), hidden: !d.hidden } });
      toast.success(d.hidden ? t("dayShown") : t("dayHidden"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <aside aria-label={t("daysTitle")} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t("daysTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("daysSub")}</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-8" onClick={() => onHindi(!hindi)} aria-pressed={hindi}>
          {hindi ? t("englishNames") : t("hindiNames")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
          <SelectTrigger className="h-8 w-36" aria-label={t("next", { n: range })}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[30, 60, 90, 180].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {t("next", { n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {DAY_SCOPES.map((s) => {
          const on = scopes.has(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(scopes);
                if (on) next.delete(s);
                else next.add(s);
                setScopes(next);
              }}
              className={cn("min-h-8 rounded-full border px-2.5 text-xs font-semibold", on ? "bg-secondary" : "opacity-60")}
            >
              {t(`scope_${s}`)}
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-xs">
        <Switch checked={showHidden} onCheckedChange={setShowHidden} /> {t("showHidden")}
      </label>
      <ul className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
        {shown.map((d) => (
          <DayCard
            key={`${d.key}${d.date}`}
            day={d}
            hindi={hindi}
            onPlan={onPlan}
            onToggleHidden={toggleHidden}
            onEdit={(x) => setEditing(x.custom)}
            onDelete={setDeleting}
          />
        ))}
        {!shown.length ? <li className="text-sm text-muted-foreground">{t("noDays")}</li> : null}
      </ul>
      <Button variant="outline" className="min-h-10 border-dashed" onClick={() => setEditing(null)}>
        <Plus aria-hidden /> {t("addCustom")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("datesNote")}</p>
      <CustomDayDialog day={editing ?? null} open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} onSaved={refresh} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? `${t("delete")}: ${deleting.name}` : ""}
        confirmLabel={t("delete")}
        destructive
        onConfirm={async () => {
          if (!deleting?.custom) return;
          try {
            await requestJson(`/api/days/custom/${deleting.custom.id}`, { method: "DELETE" });
            toast.success(t("dayDeleted"));
            await refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </aside>
  );
}
