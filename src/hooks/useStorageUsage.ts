"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { UsageResponse } from "@/types/storage";

/** Storage usage per provider (staff get only the active one). Refreshed every few minutes. */
export function useStorageUsage() {
  const query = useQuery({
    queryKey: ["storage-usage"],
    queryFn: () => requestJson<UsageResponse>("/api/storage/usage"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const active = query.data?.providers.find((p) => p.active) ?? null;
  return { ...query, active };
}
