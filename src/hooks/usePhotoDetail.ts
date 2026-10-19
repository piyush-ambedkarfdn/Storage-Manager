"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { PhotoDetail } from "@/types/photo-detail";

export const photoDetailKey = (id: string, from: string) => ["photo-detail", id, from] as const;

/** The photo detail page's data (first load comes from the server), refreshed after edits. */
export function usePhotoDetail(id: string, from: string, initialData: PhotoDetail) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: photoDetailKey(id, from),
    queryFn: () => requestJson<PhotoDetail>(`/api/photos/${id}?from=${encodeURIComponent(from)}`),
    initialData,
    staleTime: 30_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["photo-detail", id] });
  return { ...query, detail: query.data, refresh };
}
