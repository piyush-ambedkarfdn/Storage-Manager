"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { ContentItem } from "@/types/content";

/** Calendar items between two dates (inclusive), with helpers to save and refresh. */
export function useContentItems(from: string, to: string, filters: { status?: string; platform?: string } = {}) {
  const qc = useQueryClient();
  const params = new URLSearchParams({ from, to });
  if (filters.status) params.set("status", filters.status);
  if (filters.platform) params.set("platform", filters.platform);
  const query = useQuery({
    queryKey: ["content", from, to, filters.status ?? "", filters.platform ?? ""],
    queryFn: () => requestJson<{ items: ContentItem[] }>(`/api/content?${params}`).then((r) => r.items),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["content"] });

  /** Saves some fields of one item, updating the list at once (rolled back if the server refuses). */
  async function patch(id: string, fields: Partial<ContentItem>) {
    const key = ["content", from, to, filters.status ?? "", filters.platform ?? ""];
    const before = qc.getQueryData<ContentItem[]>(key);
    qc.setQueryData<ContentItem[]>(key, (list) => list?.map((i) => (i.id === id ? { ...i, ...fields } : i)));
    try {
      await requestJson(`/api/content/${id}`, { method: "PATCH", body: fields });
    } catch (err) {
      qc.setQueryData(key, before);
      throw err;
    } finally {
      void qc.invalidateQueries({ queryKey: ["content-summary"] });
    }
  }

  return { ...query, items: query.data ?? [], refresh, patch };
}
