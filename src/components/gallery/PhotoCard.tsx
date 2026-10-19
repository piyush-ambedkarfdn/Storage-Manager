"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { activityColor } from "@/config/activity-types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import type { GalleryPhoto } from "@/types/gallery";

/**
 * A photo in the grid. Clicking the photo opens its detail page; the round checkbox (or Space on it)
 * selects without opening.
 */
export function PhotoCard({
  photo,
  selected,
  onToggle,
  from,
}: {
  photo: GalleryPhoto;
  selected: boolean;
  onToggle: (shift: boolean) => void;
  from: string;
}) {
  const t = useT(galleryMessages);
  const name = [photo.village_name, photo.event_date].filter(Boolean).join(" · ") || photo.id.slice(0, 8);
  const color = activityColor(photo.activity_type);
  return (
    <div className={cn("group relative rounded-lg p-1", selected && "ring-3 ring-marigold")}>
      <Link
        href={`/admin/photos/${photo.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`}
        className="block rounded-md focus-visible:outline-2"
        aria-label={t("openDetails", { name })}
      >
        <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-photo-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnails from our storage */}
          <img src={photo.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: color }} aria-hidden />
          {photo.consent !== "yes" ? (
            <span className="absolute top-1.5 right-1.5 rounded bg-background/90 px-1.5 text-[11px] font-bold text-destructive">
              {photo.consent === "no" ? t("noConsent") : t("unsure")}
            </span>
          ) : null}
          {photo.has_children ? (
            <span className="absolute right-1.5 bottom-3 rounded bg-background/90 px-1.5 text-[11px] font-semibold">{t("children")}</span>
          ) : null}
        </span>
        <span className="mt-1 flex items-center gap-1.5 px-0.5 text-sm font-semibold">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{photo.village_name ?? "—"}</span>
        </span>
        <span className="block truncate px-0.5 text-xs text-muted-foreground">
          {[photo.panchayat_name, photo.event_date ? format(new Date(photo.event_date), "d MMM yyyy") : null].filter(Boolean).join(" · ")}
        </span>
      </Link>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={t("select", { name })}
        onClick={(e) => onToggle(e.shiftKey)}
        className={cn(
          "absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-full border-2 border-white shadow",
          selected ? "bg-marigold text-[#14213a]" : "bg-black/30 opacity-80 group-hover:opacity-100",
        )}
      >
        {selected ? <Check className="size-4" aria-hidden /> : null}
      </button>
    </div>
  );
}
