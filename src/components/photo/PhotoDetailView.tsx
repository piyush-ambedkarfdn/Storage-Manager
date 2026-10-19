"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { BulkEditDialog } from "@/components/gallery/BulkEditDialog";
import { AiDescriptionCard } from "@/components/photo/AiDescriptionCard";
import { PhotoFacts } from "@/components/photo/PhotoFacts";
import { PhotoNeighbours } from "@/components/photo/PhotoNeighbours";
import { PhotoViewer } from "@/components/photo/PhotoViewer";
import { ReportView } from "@/components/photo/ReportView";
import { usePhotoDetail } from "@/hooks/usePhotoDetail";
import { useT } from "@/lib/i18n/provider";
import { photoMessages } from "@/lib/i18n/messages/photo";
import type { PhotoDetail } from "@/types/photo-detail";

/** /admin/photos/[id]: the photo on the left; what staff entered and the report (staff + AI) on the right. */
export function PhotoDetailView({ id, from, initial }: { id: string; from: string; initial: PhotoDetail }) {
  const t = useT(photoMessages);
  const { detail, refresh } = usePhotoDetail(id, from, initial);
  const [editOpen, setEditOpen] = useState(false);
  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
  const usage = detail.usage;
  const showUsage = usage.calendar !== null || usage.stories !== null;
  const used = (usage.calendar?.length ?? 0) + (usage.stories?.length ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <PhotoNeighbours prevId={detail.prevId} nextId={detail.nextId} from={from} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-4">
          <PhotoViewer detail={detail} onEdit={() => setEditOpen(true)} />
          <AiDescriptionCard key={detail.photo.ai_description ?? ""} detail={detail} onChanged={refresh} />
          {detail.siblings.length ? (
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-2 text-base font-semibold">{t("otherPhotos", { n: detail.siblings.length })}</h2>
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {detail.siblings.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/photos/${s.id}${suffix}`} className="block overflow-hidden rounded-md bg-photo-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnails */}
                      <img src={s.thumbUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <PhotoFacts detail={detail} />
          <ReportView report={detail.report} onChanged={refresh} />
          {showUsage ? (
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-2 text-base font-semibold">{t("usedIn")}</h2>
              {used === 0 ? (
                <p className="text-sm text-muted-foreground">{t("notUsed")}</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {usage.calendar?.map((c) => (
                    <li key={c.id}>
                      {t("calendarPost")}: <b>{c.title ?? "—"}</b> · {c.platform ?? ""} · {c.publish_date ? format(new Date(c.publish_date), "d MMM yyyy") : ""} · {c.status}
                    </li>
                  ))}
                  {usage.stories?.map((s) => (
                    <li key={s.id}>
                      {t("story")}: <b>{s.title}</b> · {s.status}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
      <BulkEditDialog ids={[id]} open={editOpen} onOpenChange={setEditOpen} onDone={refresh} />
    </div>
  );
}
