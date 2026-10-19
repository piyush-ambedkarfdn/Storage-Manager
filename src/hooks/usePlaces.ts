"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PlaceLevel, PlaceList } from "@/types/places";

export type PlaceQuery = {
  parentId?: string | null;
  q?: string;
  pending?: boolean;
  limit?: number;
  offset?: number;
  /** false = don't fetch yet (for example no parent chosen) */
  enabled?: boolean;
};

/** Places of one level, optionally under a parent, searched and paged. Used by Settings and the upload pickers. */
export function usePlaces(level: PlaceLevel, opts: PlaceQuery = {}) {
  const { parentId, q, pending, limit = 50, offset = 0, enabled = true } = opts;
  const params = new URLSearchParams({ level, limit: String(limit), offset: String(offset) });
  if (parentId) params.set("parent", parentId);
  if (q?.trim()) params.set("q", q.trim());
  if (pending) params.set("pending", "1");
  return useQuery({
    queryKey: ["places", level, parentId ?? null, q?.trim() ?? "", pending ?? false, limit, offset],
    queryFn: async (): Promise<PlaceList> => {
      const res = await fetch(`/api/places?${params}`);
      const body = (await res.json().catch(() => ({}))) as PlaceList & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useInvalidatePlaces() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["places"] });
}
