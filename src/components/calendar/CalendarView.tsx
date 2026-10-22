"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { hi as hiLocale } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarTable } from "@/components/calendar/CalendarTable";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { DaysPanel } from "@/components/calendar/DaysPanel";
import { IdeasDialog } from "@/components/calendar/IdeasDialog";
import { ImportDialog } from "@/components/calendar/ImportDialog";
import { ItemPanel } from "@/components/calendar/ItemPanel";
import { NewItemDialog, type NewItemInitial } from "@/components/calendar/NewItemDialog";
import { useContentItems } from "@/hooks/useContentItems";
import { useDays } from "@/hooks/useDays";
import { isoDate } from "@/lib/days/upcoming";
import { useLocale, useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { UpcomingDay } from "@/types/days";

const UUID = /^[0-9a-f-]{36}$/i;

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
}

/**
 * The calendar page: toolbar, table or month view, days panel, New item dialog and item panel.
 * URL: ?month=YYYY-MM&view=table|month, and ?new=1&photos=id,id from the gallery's "Add to calendar".
 */
export function CalendarView() {
  const t = useT(calendarMessages);
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const month = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month")! : isoDate(new Date()).slice(0, 7);
  const view = params.get("view") === "month" ? "month" : "table";
  const fromGallery = params.get("new") === "1";
  const galleryPhotos = (params.get("photos") ?? "").split(",").filter((x) => UUID.test(x)).slice(0, 50);

  const [filters, setFilters] = useState<{ platform?: string; status?: string }>({});
  const [hindi, setHindi] = useState(locale === "hi");
  const [newItem, setNewItem] = useState<NewItemInitial | null>(fromGallery ? { photoIds: galleryPhotos } : null);
  const [panel, setPanel] = useState<string | null>(null);
  const [ideas, setIdeas] = useState(false);
  const [importing, setImporting] = useState(false);

  const { from, to } = monthRange(month);
  const { items, isLoading, patch, refresh } = useContentItems(from, to, filters);
  const { days } = useDays(from, to);

  function setUrl(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.replace(`${pathname}?${p}`, { scroll: false });
  }

  function moveMonth(delta: -1 | 0 | 1) {
    if (delta === 0) return setUrl({ month: null });
    const [y, m] = month.split("-").map(Number);
    setUrl({ month: isoDate(new Date(y, m - 1 + delta, 1)).slice(0, 7) });
  }

  function plan(d: UpcomingDay) {
    setNewItem({ date: d.date, dayKey: d.key, dayName: hindi && d.nameHi ? d.nameHi : d.name, title: hindi && d.nameHi ? d.nameHi : d.name });
  }

  const [y, m] = month.split("-").map(Number);
  const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: locale === "hi" ? hiLocale : undefined });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle", { n: items.length, month: monthLabel })}</p>
      </div>
      <CalendarToolbar
        monthLabel={monthLabel}
        view={view}
        onView={(v) => setUrl({ view: v === "table" ? null : v })}
        onMonth={moveMonth}
        platform={filters.platform}
        status={filters.status}
        onFilter={setFilters}
        onNew={() => setNewItem({})}
        onIdeas={() => setIdeas(true)}
        onImport={() => setImporting(true)}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : view === "table" ? (
            <CalendarTable items={items} patch={patch} onOpen={setPanel} onChanged={refresh} />
          ) : (
            <CalendarMonthView month={month} items={items} days={days} hindi={hindi} patch={patch} onOpen={setPanel} onNew={(date) => setNewItem({ date })} />
          )}
        </div>
        <DaysPanel hindi={hindi} onHindi={setHindi} onPlan={plan} />
      </div>

      <NewItemDialog
        open={newItem !== null}
        onOpenChange={(o) => {
          if (!o) {
            setNewItem(null);
            if (fromGallery) setUrl({ new: null, photos: null });
          }
        }}
        initial={newItem ?? {}}
        onCreated={refresh}
      />
      <ItemPanel itemId={panel} onClose={() => setPanel(null)} onChanged={refresh} />
      <IdeasDialog month={month} open={ideas} onOpenChange={setIdeas} onDone={refresh} />
      <ImportDialog open={importing} onOpenChange={setImporting} onDone={refresh} onShowMonth={(m) => setUrl({ month: m })} />
    </div>
  );
}
