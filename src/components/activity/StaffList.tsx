"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { hi as hiLocale } from "date-fns/locale";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { activityMessages } from "@/lib/i18n/messages/activity";
import type { StaffStat } from "@/types/activity-view";

/** People to choose from: name, role, districts, last active. "Everyone" shows the whole log. */
export function StaffList({ staff, selected, onSelect }: { staff: StaffStat[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const t = useT(activityMessages);
  const locale = useLocale();
  const [q, setQ] = useState("");
  const shown = staff.filter((s) => [s.full_name, s.login_id].some((v) => v?.toLowerCase().includes(q.trim().toLowerCase())));
  const item = (active: boolean) =>
    cn("flex w-full flex-col items-start gap-0.5 rounded-md border-l-[3px] px-3 py-2 text-left text-sm hover:bg-secondary", active ? "border-marigold bg-secondary" : "border-transparent");

  return (
    <aside className="flex flex-col gap-2 rounded-lg border bg-card p-2" aria-label={t("title")}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchStaff")} aria-label={t("searchStaff")} className="h-9 pl-9" />
      </div>
      <ul className="flex max-h-[70dvh] flex-col overflow-y-auto">
        <li>
          <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)} className={item(selected === null)}>
            <b>{t("everyone")}</b>
          </button>
        </li>
        {shown.map((s) => (
          <li key={s.user_id}>
            <button type="button" aria-pressed={selected === s.user_id} onClick={() => onSelect(s.user_id)} className={item(selected === s.user_id)}>
              <span className={cn("font-semibold", !s.active && "text-muted-foreground line-through")}>{s.full_name || s.login_id}</span>
              <span className="text-xs text-muted-foreground">
                {s.role === "admin" ? "Admin" : (s.districts ?? t("noDistricts"))}
                {!s.active ? ` · ${t("inactive")}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.last_seen_at
                  ? t("lastSeen", { when: formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true, locale: locale === "hi" ? hiLocale : undefined }) })
                  : t("never")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
