"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
// dialogs are only loaded when someone opens them (keeps the gallery page light)
const BulkEditDialog = dynamic(() => import("@/components/gallery/BulkEditDialog").then((m) => m.BulkEditDialog), { ssr: false });
const DownloadDialog = dynamic(() => import("@/components/gallery/DownloadDialog").then((m) => m.DownloadDialog), { ssr: false });
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { SelectionBar } from "@/components/gallery/SelectionBar";
import { requestJson } from "@/hooks/useOptions";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import type { GalleryPage } from "@/types/gallery";

/** The photo grid with paging, selection (Shift-click selects a range), and the actions on the selection. */
export function PhotoGrid() {
  const t = useT(galleryMessages);
  const qc = useQueryClient();
  const { fullQuery } = useGalleryFilters();
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ["gallery", fullQuery],
    // keep showing the photos on screen while a changed filter loads, instead of flashing empty
    placeholderData: keepPreviousData,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      requestJson<GalleryPage>(`/api/gallery?${fullQuery}${fullQuery ? "&" : ""}limit=48${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (last) => last.nextCursor,
  });
  const photos = useMemo(() => query.data?.pages.flatMap((p) => p.photos) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? null;

  function toggle(id: string, shift: boolean) {
    if (shift && anchor) {
      const a = photos.findIndex((p) => p.id === anchor);
      const b = photos.findIndex((p) => p.id === id);
      if (a >= 0 && b >= 0) {
        const range = photos.slice(Math.min(a, b), Math.max(a, b) + 1).map((p) => p.id);
        setSelected((s) => [...new Set([...s, ...range])]);
        return;
      }
    }
    setAnchor(id);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["gallery"] });
    void qc.invalidateQueries({ queryKey: ["gallery-tree"] });
  };

  return (
    <section className="flex flex-col gap-3" aria-label={t("title")}>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span aria-live="polite">{total !== null ? t("count", { n: total }) : ""}</span>
        <Button variant="outline" size="sm" className="min-h-9" onClick={() => setDownloadOpen(true)} disabled={!total}>
          {t("download")}
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : query.error ? (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : String(query.error)}
        </p>
      ) : photos.length === 0 ? (
        <EmptyState icon={<Images className="size-8" aria-hidden />} title={t("empty")} body={t("emptyBody")} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
          {photos.map((p) => (
            <PhotoCard key={p.id} photo={p} selected={selected.includes(p.id)} onToggle={(shift) => toggle(p.id, shift)} from={fullQuery} />
          ))}
        </div>
      )}

      {query.hasNextPage ? (
        <Button variant="outline" className="min-h-11 self-center" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {t("loadMore")}
        </Button>
      ) : null}

      <SelectionBar
        ids={selected}
        onClear={() => setSelected([])}
        onSelectPage={() => setSelected([...new Set([...selected, ...photos.map((p) => p.id)])])}
        onDownload={() => setDownloadOpen(true)}
        onEdit={() => setEditOpen(true)}
        onChanged={refresh}
      />
      {downloadOpen ? (
        <DownloadDialog open onOpenChange={setDownloadOpen} viewQuery={fullQuery} viewCount={total} selectedIds={selected} />
      ) : null}
      {editOpen ? <BulkEditDialog ids={selected} open onOpenChange={setEditOpen} onDone={refresh} /> : null}
    </section>
  );
}
