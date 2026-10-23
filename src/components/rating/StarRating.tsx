"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { ratingMessages } from "@/lib/i18n/messages/rating";

/**
 * Five stars. Interactive (onChange given): large targets for phones, tap the same star again to clear.
 * Read-only (no onChange): a small "★ 4" badge, or nothing when the photo is not rated.
 */
export function StarRating({
  value,
  onChange,
  className,
}: {
  value: number | null | undefined;
  onChange?: (next: number | null) => void;
  className?: string;
}) {
  const t = useT(ratingMessages);

  if (!onChange) {
    if (!value) return null;
    return (
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", className)} aria-label={t("starsOf", { n: value })}>
        <Star className="size-3.5 fill-marigold text-marigold" aria-hidden />
        {value}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={t("rating")} className={cn("flex items-center", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = !!value && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t(n === 1 ? "star" : "stars", { n })}
            onClick={() => onChange(value === n ? null : n)}
            className="grid size-10 place-items-center rounded-md focus-visible:outline-2"
          >
            <Star className={cn("size-6", on ? "fill-marigold text-marigold" : "text-muted-foreground")} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
