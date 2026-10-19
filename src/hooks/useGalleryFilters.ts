"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersToParams, parseFilters } from "@/lib/gallery/filters";
import type { GalleryFilters } from "@/types/gallery";

/** Gallery filters kept in the URL, so views can be bookmarked, shared, and restored by Back. */
export function useGalleryFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = params.toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(queryString)), [queryString]);

  const setFilters = useCallback(
    (patch: Partial<GalleryFilters> | ((f: GalleryFilters) => GalleryFilters)) => {
      const next = typeof patch === "function" ? patch(filters) : { ...filters, ...patch };
      const qs = filtersToParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  /** The query string without folder ticks (for the tree counts). */
  const treeQuery = useMemo(() => filtersToParams(filters, { withFolders: false }).toString(), [filters]);
  const fullQuery = useMemo(() => filtersToParams(filters).toString(), [filters]);

  return { filters, setFilters, treeQuery, fullQuery };
}
