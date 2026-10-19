"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFolderTree } from "@/hooks/useFolderTree";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { folderLabel } from "@/lib/gallery/tree";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";

/** The ticked folders as removable chips ("Program / Chatra / Panchayat A"). */
export function Crumbs() {
  const t = useT(galleryMessages);
  const { filters, setFilters, treeQuery } = useGalleryFilters();
  const { index } = useFolderTree(treeQuery);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{t("showing")}:</span>
      {filters.folders.length === 0 ? (
        <span className="font-semibold">{t("allPhotos")}</span>
      ) : (
        <>
          {filters.folders.map((key) => {
            const label = folderLabel(key, index);
            return (
              <span key={key} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pr-1 pl-3 font-semibold">
                {label}
                <button
                  type="button"
                  onClick={() => setFilters({ folders: filters.folders.filter((k) => k !== key) })}
                  className="grid size-6 place-items-center rounded-full hover:bg-background"
                  aria-label={t("removeFolder", { name: label })}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            );
          })}
          <Button variant="link" size="sm" className="h-auto px-1" onClick={() => setFilters({ folders: [] })}>
            {t("clearAll")}
          </Button>
        </>
      )}
    </div>
  );
}
