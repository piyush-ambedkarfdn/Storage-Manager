"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestJson } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { ContentPhoto } from "@/types/content";
import type { PhotoDto } from "@/types/photo";

/** The story's photos, and a picker with the photos of its linked reports. */
export function StoryPhotoPicker({ photos, reportIds, onChange }: { photos: ContentPhoto[]; reportIds: string[]; onChange: (ids: string[]) => void }) {
  const t = useT(storiesMessages);
  const [open, setOpen] = useState(false);
  const ids = photos.map((p) => p.id);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("storyPhotos")}</h3>
        <Button size="sm" variant="outline" className="min-h-8" onClick={() => setOpen(true)} disabled={!reportIds.length}>
          <ImagePlus aria-hidden /> {t("addPhotos")}
        </Button>
      </div>
      {!photos.length ? <p className="text-sm text-muted-foreground">{t("noPhotos")}</p> : null}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {photos.map((p) => (
          <li key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
            <img src={p.thumbUrl} alt={p.village_name ?? ""} className={cn("aspect-square w-full rounded-md object-cover", p.consent !== "yes" && "ring-2 ring-destructive")} />
            <button
              type="button"
              onClick={() => onChange(ids.filter((x) => x !== p.id))}
              className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-background/90 shadow"
              aria-label={`${t("remove")}: ${p.village_name ?? ""}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {open ? <Picker reportIds={reportIds} existing={ids} onClose={() => setOpen(false)} onAdd={(add) => onChange([...ids, ...add])} /> : null}
    </section>
  );
}

function Picker({ reportIds, existing, onClose, onAdd }: { reportIds: string[]; existing: string[]; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const t = useT(storiesMessages);
  const [picked, setPicked] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: ["story-photo-picker", reportIds.join(",")],
    queryFn: async () => {
      const lists = await Promise.all(reportIds.slice(0, 15).map((id) => requestJson<{ photos: PhotoDto[] }>(`/api/photos?report_id=${id}&limit=48`)));
      return lists.flatMap((l) => l.photos);
    },
  });
  const photos = (data ?? []).filter((p) => !existing.includes(p.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pickPhotos")}</DialogTitle>
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
                  <img src={p.thumbUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
                  {on ? (
                    <span className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-marigold text-[#14213a]">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                  {p.consent !== "yes" ? <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1 text-[10px] font-bold text-destructive">!</span> : null}
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
            {t("addSelected", { n: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
