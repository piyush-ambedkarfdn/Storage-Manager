"use client";

import { useOptions } from "@/hooks/useOptions";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";

/** Problem-theme chips: photos whose field report has any of the chosen themes. */
export function ThemeFilterChips() {
  const t = useT(galleryMessages);
  const { options } = useOptions("theme");
  const { filters, setFilters } = useGalleryFilters();
  if (!options.length) return null;
  const toggle = (id: string) =>
    setFilters({ themes: filters.themes.includes(id) ? filters.themes.filter((x) => x !== id) : [...filters.themes, id] });
  return (
    <div role="group" aria-label={t("themes")} className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{t("themes")}:</span>
      {options.map((o) => {
        const on = filters.themes.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o.id)}
            className={cn("min-h-8 rounded-full border px-3 text-xs font-semibold", on ? "border-marigold-ink bg-marigold/15" : "bg-card")}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}
