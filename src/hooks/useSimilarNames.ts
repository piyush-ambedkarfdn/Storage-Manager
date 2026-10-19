"use client";

import { useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { MergeType, SimilarName } from "@/types/places";

export type SimilarResult = { matches: SimilarName[]; exact: SimilarName | null; warn: SimilarName[] };

/** "Did you mean …?" check for a typed name (find_similar_names in the database). */
export function useSimilarNames(type: MergeType, typed: string, parentId: string | null | undefined, enabled = true) {
  const q = useDeferredValue(typed.trim());
  return useQuery({
    queryKey: ["similar", type, q, parentId ?? null],
    enabled: enabled && q.length >= 2,
    queryFn: () => {
      const p = new URLSearchParams({ type, q });
      if (parentId) p.set("parent", parentId);
      return requestJson<SimilarResult>(`/api/names/similar?${p}`);
    },
    staleTime: 60_000,
  });
}
