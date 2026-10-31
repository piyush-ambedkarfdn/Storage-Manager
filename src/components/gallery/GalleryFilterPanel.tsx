"use client";

import { useState } from "react";
import { FilterX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityFilterChips } from "@/components/gallery/ActivityFilterChips";
import { FilterBar } from "@/components/gallery/FilterBar";
import { ThemeFilterChips } from "@/components/gallery/ThemeFilterChips";
import { CategoryFilterChips } from "@/components/categories/CategoryFilterChips";
import { useProgramFields } from "@/hooks/useProgramFields";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { useOptions } from "@/hooks/useOptions";
import { hasSeveralPrograms } from "@/lib/gallery/program-filter";
import { useT } from "@/lib/i18n/provider";
import { galleryFiltersMessages } from "@/lib/i18n/messages/galleryFilters";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const SEVERAL = "__several__";

/**
 * Gallery filters, program first. Choose a program and that program's own filters appear (its categories, such as
 * "Type of Activity in CFW initiative", and the type of activity); with no program the gallery stays generic.
 * On a phone everything except the program and the clear button folds into one "Filters" button.
 */
export function GalleryFilterPanel() {
  const t = useT(galleryFiltersMessages);
  const { filters, setFilters, clearAll, activeCount, program } = useGalleryFilters();
  const { options: programs } = useOptions("program");
  const { fields } = useProgramFields(program);
  const [open, setOpen] = useState(false);
  const several = hasSeveralPrograms(filters);
  const programName = programs.find((p) => p.id === program)?.value ?? "";
  const hasCategories = fields.some((f) => f.options.length);

  function choose(value: string) {
    if (value === SEVERAL) return;
    // a program's categories and activity types belong to it: switching program starts them again
    setFilters({ folders: value === ALL ? [] : [value], categories: [], activity: [] });
  }

  return (
    <section aria-label={t("filters")} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium sm:max-w-xs">
          {t("program")}
          <Select value={program ?? (several ? SEVERAL : ALL)} onValueChange={choose}>
            <SelectTrigger className="h-11 w-full text-base sm:h-10 sm:text-sm" aria-label={t("program")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allPrograms")}</SelectItem>
              {several ? (
                <SelectItem value={SEVERAL} disabled>
                  {t("severalPrograms")}
                </SelectItem>
              ) : null}
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button type="button" variant="outline" className="h-11 sm:h-10 md:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <SlidersHorizontal aria-hidden /> {activeCount ? t("filtersCount", { n: activeCount }) : t("filters")}
        </Button>
        {activeCount ? (
          <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={clearAll}>
            <FilterX aria-hidden /> {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      <div className={cn("flex-col gap-3", open ? "flex" : "hidden", "md:flex")}>
        {program ? (
          <div className="flex flex-col gap-2 rounded-md border bg-secondary/40 p-3">
            <h3 className="text-sm font-semibold">{t("programFilters", { program: programName })}</h3>
            {hasCategories ? <CategoryFilterChips programId={program} /> : <p className="text-xs text-muted-foreground">{t("noCategories")}</p>}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("activityType")}</span>
              <ActivityFilterChips programId={program} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("chooseProgramHint")}</p>
        )}
        <ThemeFilterChips />
        <FilterBar />
      </div>
    </section>
  );
}
