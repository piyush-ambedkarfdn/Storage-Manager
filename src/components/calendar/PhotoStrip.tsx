"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { activityColor } from "@/config/activity-types";
import { requestJson } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { ContentPhoto } from "@/types/content";
import type { GalleryPage } from "@/types/gallery";

/** Photos in a post: activity colour, remove, and "Add from gallery" (photos not used in any post yet). */
export function PhotoStrip({
  photos,
  onRemove,
  onAdd,
}: {
  photos: ContentPhoto[];
  onRemove: (id: string) => void;
  onAdd: (ids: string[]) => void;
}) {
  const t = useT(calendarMessages);
  const [picking, setPicking] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("photosInPost")}</h3>
        <Button type="button" size="sm" variant="outline" className="min-h-8" onClick={() => setPicking(true)}>
          <ImagePlus aria-hidden /> {t("addFromGallery")}
        </Button>
      </div>
      {photos.length ? (
        <ul className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
              <img src={p.thumbUrl} alt={p.village_name ?? ""} className="aspect-square w-full rounded-md bg-photo-surface object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1 rounded-b-md" style={{ backgroundColor: activityColor(p.activity_type) }} aria-hidden />
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-background/90 shadow"
                aria-label={`${t("remove")}: ${p.village_name ?? ""}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>
      )}
      {picking ? <Picker existing={photos.map((p) => p.id)} onClose={() => setPicking(false)} onAdd={onAdd} /> : null}
    </section>
  );
}

function Picker({ existing, onClose, onAdd }: { existing: string[]; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const t = useT(calendarMessages);
  const [picked, setPicked] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: ["gallery", "unused=1", "picker"],
    queryFn: () => requestJson<GalleryPage>("/api/gallery?unused=1&limit=48"),
  });
  const photos = (data?.photos ?? []).filter((p) => !existing.includes(p.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pickTitle")}</DialogTitle>
        </DialogHeader>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p) => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                  className={cn("relative block w-full rounded-md", on && "ring-3 ring-marigold")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
                  <img src={p.thumbUrl} alt={p.village_name ?? ""} className="aspect-square w-full rounded-md object-cover" />
                  {on ? (
                    <span className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-marigold text-[#14213a]">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                  <span className="block truncate text-left text-xs">{p.village_name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={!picked.length}
            onClick={() => {
              onAdd(picked);
              onClose();
            }}
          >
            {t("pickAdd", { n: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
