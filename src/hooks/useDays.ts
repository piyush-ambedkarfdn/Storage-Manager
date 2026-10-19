"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { UpcomingDay } from "@/types/days";

/** National, international and custom days between two dates. includeHidden shows hidden built-in days too. */
export function useDays(from: string, to: string, includeHidden = false) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["days", from, to, includeHidden],
    queryFn: () =>
      requestJson<{ days: UpcomingDay[] }>(`/api/days?from=${from}&to=${to}${includeHidden ? "&all=1" : ""}`).then((r) => r.days),
    staleTime: 5 * 60_000,
  });
  return { ...query, days: query.data ?? [], refresh: () => qc.invalidateQueries({ queryKey: ["days"] }) };
}
