"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderTreeNode } from "@/components/gallery/FolderTreeNode";
import { useFolderTree } from "@/hooks/useFolderTree";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { searchTree, toggleFolder } from "@/lib/gallery/tree";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import type { FolderKey } from "@/types/gallery";

/** The explorer panel: search, Expand / Collapse, and the Program / District / Panchayat / Village tree. */
export function FolderTree() {
  const t = useT(galleryMessages);
  const { filters, setFilters, treeQuery } = useGalleryFilters();
  const { tree, index, isLoading } = useFolderTree(treeQuery);
  const [expandedOverride, setExpanded] = useState<Set<FolderKey> | null>(null);
  const [q, setQ] = useState("");

  // programs start open
  const expanded = useMemo(() => expandedOverride ?? new Set(tree.map((n) => n.key)), [expandedOverride, tree]);
  const visible = useMemo(() => (q.trim() ? searchTree(tree, q) : null), [tree, q]);

  function toggleExpand(key: FolderKey) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  }

  return (
    <aside aria-label={t("explorer")} className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-1.5 bg-secondary px-2 py-1.5 text-xs font-bold tracking-wide uppercase">
        <span className="flex-1">{t("explorer")}</span>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs normal-case" onClick={() => setExpanded(new Set(index.keys()))}>
          {t("expandAll")}
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs normal-case" onClick={() => setExpanded(new Set())}>
          {t("collapseAll")}
        </Button>
      </div>
      <div className="relative p-2">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchFolders")} aria-label={t("searchFolders")} className="h-9 pl-8" />
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-1 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-7" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{t("noFolders")}</p>
        ) : (
          <ul role="tree" aria-label={t("explorer")} aria-multiselectable>
            {tree.map((n) => (
              <FolderTreeNode
                key={n.key}
                node={n}
                depth={0}
                selected={filters.folders}
                expanded={expanded}
                visible={visible}
                onCheck={(key) => setFilters({ folders: toggleFolder(key, filters.folders, index) })}
                onExpand={toggleExpand}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
