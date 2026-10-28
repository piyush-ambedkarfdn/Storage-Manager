"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FolderUp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityChip } from "@/components/shared/ActivityChip";
import { ColorChip } from "@/components/shared/ColorChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { MyUploadsGrid } from "@/components/uploads/MyUploadsGrid";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages, type UploadKey } from "@/lib/i18n/messages/upload";
import { REPORT_PART_KEYS, type ReportWithPhotos } from "@/types/report";

type Page = { reports: ReportWithPhotos[]; nextBefore: string | null };

/** My uploads: the person's own reports (as they wrote them) with their photos, newest first. */
export function MyReportsList() {
  const t = useT(uploadMessages);
  const queue = useUploadQueue();
  const { allOptions: themes } = useOptions("theme");
  const themeById = new Map(themes.map((o) => [o.id, o]));
  const query = useInfiniteQuery({
    queryKey: ["my-reports"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => requestJson<Page>(`/api/reports?limit=10${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (last) => last.nextBefore,
  });
  const reports = query.data?.pages.flatMap((p) => p.reports) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {queue.counts.pending > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
          <span>{t("pendingNotice", { n: queue.counts.pending })}</span>
          <Link href="/upload" className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-9" })}>
            {t("openQueue")}
          </Link>
        </div>
      ) : null}

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FolderUp className="size-8" aria-hidden />}
          title={t("myEmpty")}
          action={
            <Link href="/upload" className={buttonVariants({ className: "min-h-11" })}>
              {t("myEmptyAction")}
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{r.event_date ? format(new Date(r.event_date), "d MMM yyyy") : ""}</b>
                <ActivityChip id={r.activity_type} />
                <span className="text-muted-foreground">{t("photosCount", { n: r.photos.length })}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {r.program_name} · {r.place_path}
              </div>
              {r.report_parts ? (
                <dl className="flex flex-col gap-1 text-sm">
                  {REPORT_PART_KEYS.filter((k) => r.report_parts?.[k]).map((k) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold text-muted-foreground">{t(`q_${k}` as UploadKey)}</dt>
                      <dd className="whitespace-pre-line">{r.report_parts?.[k]}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {r.theme_ids.map((id) => {
                  const th = themeById.get(id);
                  return th ? <ColorChip key={id} color={th.color ?? "#7A8AA3"} label={th.value} /> : null;
                })}
              </div>
              {r.photos.length ? <MyUploadsGrid photos={r.photos} /> : <p className="text-sm text-muted-foreground">{t("noPhotosYet")}</p>}
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button variant="outline" className="min-h-11" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
