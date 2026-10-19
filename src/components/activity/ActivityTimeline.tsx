"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { activityMessages, type ActivityKey } from "@/lib/i18n/messages/activity";
import type { ActivityFilterValue } from "@/components/activity/ActivityFilters";
import type { TimelineEntry } from "@/types/activity-view";

/** A few useful words from the detail (counts, names, titles), never the whole JSON. */
function detailText(d: Record<string, unknown> | null): string {
  if (!d) return "";
  const parts: string[] = [];
  for (const k of ["count", "name", "title", "login", "value", "from", "to", "model", "purpose", "photos", "moved", "purged", "failed"]) {
    const v = d[k];
    if (v !== undefined && v !== null && typeof v !== "object" && String(v).length < 60) parts.push(`${k}: ${v}`);
  }
  return parts.slice(0, 3).join(" · ");
}

/** Newest first, grouped by day (India time), with "Show older". */
export function ActivityTimeline({ user, filters }: { user: string | null; filters: ActivityFilterValue }) {
  const t = useT(activityMessages);
  const qs = new URLSearchParams({ view: "timeline", limit: "50" });
  if (user) qs.set("user", user);
  if (filters.group) qs.set("group", filters.group);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  const query = useInfiniteQuery({
    queryKey: ["activity", qs.toString()],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      requestJson<{ entries: TimelineEntry[]; nextCursor: string | null }>(`/api/activity?${qs}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (last) => last.nextCursor,
  });
  const entries = query.data?.pages.flatMap((p) => p.entries) ?? [];
  if (query.isLoading) return <Skeleton className="h-60" />;
  if (!entries.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;

  const dayOf = (iso: string) => format(new Date(iso), "EEEE d MMMM yyyy");
  return (
    <section className="flex flex-col gap-1 rounded-lg border bg-card p-4" aria-label={t("timeline")}>
      <h2 className="mb-1 text-base font-semibold">{t("timeline")}</h2>
      <ol className="flex flex-col">
        {entries.map((e, i) => {
          const when = new Date(e.created_at);
          const day = dayOf(e.created_at);
          const header = i === 0 || dayOf(entries[i - 1].created_at) !== day ? day : null;
          const label = t(`a_${e.action}` as ActivityKey);
          return (
            <li key={e.id}>
              {header ? <h3 className="mt-3 mb-1 text-xs font-semibold text-muted-foreground uppercase">{header}</h3> : null}
              <div className="flex items-baseline gap-3 border-l-2 border-secondary py-1 pl-3 text-sm">
                <time dateTime={e.created_at} className="w-12 shrink-0 tabular-nums text-muted-foreground">
                  {format(when, "HH:mm")}
                </time>
                <span>
                  {!user ? <b>{e.actor_name ?? (e.actor ? "—" : t("system"))} </b> : null}
                  {label.startsWith("a_") ? e.action : label}
                  {detailText(e.detail) ? <span className="text-muted-foreground"> · {detailText(e.detail)}</span> : null}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {query.hasNextPage ? (
        <Button variant="outline" className="mt-2 min-h-10 self-center" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {t("loadMore")}
        </Button>
      ) : null}
    </section>
  );
}
