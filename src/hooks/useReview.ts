"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { ReviewPhoto } from "@/types/review";

/** The photos waiting for review (admin). */
export function useReviewList() {
  return useQuery({ queryKey: ["review"], queryFn: () => requestJson<{ photos: ReviewPhoto[] }>("/api/review").then((r) => r.photos) });
}

/** How many photos wait (shown on the sidebar); checked once a minute. */
export function useReviewCount() {
  return useQuery({
    queryKey: ["review-count"],
    queryFn: () => requestJson<{ count: number }>("/api/review/count").then((r) => r.count),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** After a decision: the waiting list, the counter, and everything that shows approved photos. */
export function useRefreshAfterReview() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["review", "review-count", "gallery", "gallery-tree", "program-view"]) void qc.invalidateQueries({ queryKey: [key] });
  };
}
