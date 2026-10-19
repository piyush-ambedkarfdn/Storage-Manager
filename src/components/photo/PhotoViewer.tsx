"use client";

import { useState } from "react";
import { Download, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { activityColor } from "@/config/activity-types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { photoMessages } from "@/lib/i18n/messages/photo";
import type { PhotoDetail } from "@/types/photo-detail";

/** The photo on the neutral photo surface: fit to screen or zoomed, open the original, download. */
export function PhotoViewer({ detail, onEdit }: { detail: PhotoDetail; onEdit: () => void }) {
  const t = useT(photoMessages);
  const [zoom, setZoom] = useState(false);
  const p = detail.photo;
  const alt = p.ai_description ?? [p.village_name, p.event_date].filter(Boolean).join(", ");
  return (
    <div className="rounded-lg bg-photo-surface p-3">
      <div className={cn("relative overflow-auto rounded-md", zoom ? "max-h-[80dvh]" : "")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the original, served through our access-checked route */}
        <img
          src={detail.displayUrl}
          alt={alt}
          className={cn("mx-auto block", zoom ? "max-w-none cursor-zoom-out" : "max-h-[70dvh] w-full cursor-zoom-in object-contain")}
          onClick={() => setZoom((z) => !z)}
        />
        <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: activityColor(p.activity_type) }} aria-hidden />
      </div>
      {!detail.originalAvailable ? <p className="mt-2 text-sm">{t("archived")}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-10 bg-background" onClick={() => setZoom((z) => !z)}>
          {zoom ? <ZoomOut aria-hidden /> : <ZoomIn aria-hidden />} {zoom ? t("zoomOut") : t("zoomIn")}
        </Button>
        {detail.originalAvailable ? (
          <>
            <a href={detail.displayUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", className: "min-h-10 bg-background" })}>
              <ExternalLink aria-hidden /> {t("openOriginal")}
            </a>
            <a href={detail.displayUrl} download={`${p.id}.jpg`} className={buttonVariants({ variant: "outline", className: "min-h-10 bg-background" })}>
              <Download aria-hidden /> {t("download")}
            </a>
          </>
        ) : null}
        <Button variant="outline" className="min-h-10 bg-background" onClick={onEdit}>
          {t("editDetails")}
        </Button>
      </div>
    </div>
  );
}
