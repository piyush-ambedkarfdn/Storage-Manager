"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import type { OptionItem, OptionType, Program } from "@/types/options";

/**
 * fetch + JSON for the app's own API: sends JSON, throws an Error with the API's `{ error }` message.
 * Client-side helper shared by the settings components (and later phases).
 */
export async function requestJson<T>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body !== undefined ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

function toOption(p: Program): OptionItem {
  return { id: p.id, type: "program", value: p.name, color: null, sort_order: p.sort_order, hidden: p.hidden, protects_photos: false, slug: p.slug };
}

export const optionsKey = (type: OptionType | "program") => ["options", type] as const;

/**
 * One option list (or "program"), in order. `options` = visible ones (what pickers show);
 * `allOptions` also has hidden ones (admins only; staff never receive hidden options).
 */
export function useOptions(type: OptionType | "program") {
  const profile = useProfile();
  const all = profile.role === "admin" ? "1" : "0";
  const query = useQuery({
    queryKey: optionsKey(type),
    queryFn: async (): Promise<OptionItem[]> =>
      type === "program"
        ? (await requestJson<{ programs: Program[] }>(`/api/programs?all=${all}`)).programs.map(toOption)
        : (await requestJson<{ options: OptionItem[] }>(`/api/options?type=${type}&all=${all}`)).options,
    staleTime: 5 * 60_000,
  });
  const allOptions = query.data ?? [];
  return {
    options: allOptions.filter((o) => !o.hidden),
    allOptions,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Call after any change so every page shows the new lists at once. */
export function useInvalidateOptions() {
  const qc = useQueryClient();
  return (type?: OptionType | "program") =>
    qc.invalidateQueries({ queryKey: type ? optionsKey(type) : ["options"] });
}
