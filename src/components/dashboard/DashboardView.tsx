"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityBars } from "@/components/dashboard/ActivityBars";
import { LibraryStats } from "@/components/dashboard/LibraryStats";
import { OverdueList } from "@/components/dashboard/OverdueList";
import { PlatformBars } from "@/components/dashboard/PlatformBars";
import { StageCards } from "@/components/dashboard/StageCards";
import { StorageSummary } from "@/components/dashboard/StorageSummary";
import { ThemeBars } from "@/components/dashboard/ThemeBars";
import { UpcomingDays } from "@/components/dashboard/UpcomingDays";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { requestJson } from "@/hooks/useOptions";
import { isoDate } from "@/lib/days/upcoming";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import type { ContentSummary } from "@/types/content";

/** The admin home from phase 6 on. */
export function DashboardView() {
  const t = useT(dashboardMessages);
  const today = isoDate(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ["content-summary", today],
    queryFn: () => requestJson<ContentSummary>(`/api/content/summary?today=${today}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Link href="/admin/gallery" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
              {t("openGallery")}
            </Link>
            <Link href="/admin/calendar?new=1" className={buttonVariants({ className: "min-h-11" })}>
              {t("newItem")}
            </Link>
          </>
        }
      />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <StageCards byStage={data.byStage} />
          <div className="grid gap-4 lg:grid-cols-3">
            <PlatformBars byPlatform={data.byPlatform} />
            <section className="rounded-lg border bg-card p-4">
              <UpcomingList items={data.next7} />
              <OverdueList items={data.overdue} />
            </section>
            <UpcomingDays />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ActivityBars counts={data.photosByActivity} />
            <ThemeBars counts={data.reportsByTheme} />
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <h2 className="text-base font-semibold">{t("library")}</h2>
              <LibraryStats library={data.library} />
              <StorageSummary />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
