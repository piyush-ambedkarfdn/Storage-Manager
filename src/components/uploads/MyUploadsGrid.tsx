"use client";

import type { PhotoDto } from "@/types/photo";

/** Thumbnails of one report's photos (thumbUrl comes from the server; the browser never builds storage URLs). */
export function MyUploadsGrid({ photos }: { photos: PhotoDto[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <li key={p.id} className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- small cached thumbnails from our storage */}
          <img
            src={p.thumbUrl}
            alt={p.note ?? ""}
            loading="lazy"
            className="aspect-square w-full rounded-md bg-photo-surface object-cover"
          />
          {p.note ? <span className="line-clamp-2 text-xs text-muted-foreground">{p.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
