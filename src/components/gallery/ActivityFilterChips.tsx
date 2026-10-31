"use client";

import { useActivityTypes } from "@/components/layout/ActivityTypesProvider";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";

/**
 * Multi-select activity chips (retired types stay filterable for old photos). With a program: that program's own types,
 * or the general ones when it has none.
 */
export function ActivityFilterChips({ programId }: { programId?: string | null } = {}) {
  const t = useT(galleryMessages);
  const locale = useLocale();
  const { all: every } = useActivityTypes();
  const own = programId ? every.filter((a) => a.programId === programId) : [];
  const all = programId ? (own.length ? own : every.filter((a) => !a.programId)) : every;
  const { filters, setFilters } = useGalleryFilters();
  const toggle = (id: string) =>
    setFilters({ activity: filters.activity.includes(id) ? filters.activity.filter((a) => a !== id) : [...filters.activity, id] });
  return (
    <div role="group" aria-label={t("activity")} className="flex flex-wrap gap-1.5">
      {all.map((a) => {
        const on = filters.activity.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(a.id)}
            className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold", on ? "border-2" : "bg-card")}
            style={on ? { borderColor: a.color, backgroundColor: `color-mix(in srgb, ${a.color} 16%, transparent)` } : undefined}
          >
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: a.color }} />
            {locale === "hi" ? a.labelHi : a.label}
          </button>
        );
      })}
    </div>
  );
}
