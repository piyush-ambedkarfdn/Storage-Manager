"use client";

import { StatusBadge } from "@/components/uploads/StatusBadge";
import type { PhotoDto } from "@/types/photo";

/** Thumbnails of one report's photos (thumbUrl comes from the server; the browser never builds storage URLs). */
export function MyUploadsGrid({ photos }: { photos: PhotoDto[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <li key={p.id} className="flex flex-col gap-1">
          <div className="relative">
            {p.status === "rejected" ? (
              // the files of a rejected photo are deleted, so there is no picture to show
              <div className="aspect-square w-full rounded-md bg-photo-surface" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- small cached thumbnails from our storage
              <img src={p.thumbUrl} alt={p.note ?? ""} loading="lazy" className="aspect-square w-full rounded-md bg-photo-surface object-cover" />
            )}
            {p.status === "pending" || p.status === "rejected" ? <StatusBadge status={p.status} className="absolute bottom-1 left-1" /> : null}
          </div>
          {p.note ? <span className="line-clamp-2 text-xs text-muted-foreground">{p.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
