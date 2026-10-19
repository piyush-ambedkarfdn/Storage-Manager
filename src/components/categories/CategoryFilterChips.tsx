"use client";

import { useAllProgramFields } from "@/hooks/useProgramFields";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { categoriesMessages } from "@/lib/i18n/messages/categories";

/** Gallery filter: one row per program category ("GOONJ · Stage: Before / During / After"). */
export function CategoryFilterChips() {
  const t = useT(categoriesMessages);
  const locale = useLocale();
  const { fields } = useAllProgramFields();
  const { filters, setFilters } = useGalleryFilters();
  const withOptions = fields.filter((f) => f.options.length);
  if (!withOptions.length) return null;
  const toggle = (id: string) =>
    setFilters({ categories: filters.categories.includes(id) ? filters.categories.filter((x) => x !== id) : [...filters.categories, id] });
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={t("filter")}>
      {withOptions.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">
            {f.program_name ? `${f.program_name} · ` : ""}
            {locale === "hi" && f.label_hi ? f.label_hi : f.label}:
          </span>
          {f.options.map((o) => {
            const on = filters.categories.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.id)}
                className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", on ? "border-2" : "bg-card")}
                style={on ? { borderColor: o.color ?? "#7A8AA3", backgroundColor: `color-mix(in srgb, ${o.color ?? "#7A8AA3"} 16%, transparent)` } : undefined}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: o.color ?? "#7A8AA3" }} />
                {locale === "hi" && o.value_hi ? o.value_hi : o.value}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
