"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityFilters, type ActivityFilterValue } from "@/components/activity/ActivityFilters";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { StaffList } from "@/components/activity/StaffList";
import { StaffSummaryCards } from "@/components/activity/StaffSummaryCards";
import { UploadsChart } from "@/components/activity/UploadsChart";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { activityMessages } from "@/lib/i18n/messages/activity";
import type { DayCount, StaffStat } from "@/types/activity-view";

const UUID = /^[0-9a-f-]{36}$/i;

/** Staff activity (admins only: the admin layout checks the role, and the API checks again). The person is kept in ?user=. */
function ActivityView() {
  const t = useT(activityMessages);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("user");
  const user = raw && UUID.test(raw) ? raw : null;
  const [filters, setFilters] = useState<ActivityFilterValue>({});

  const staff = useQuery({ queryKey: ["staff-stats"], queryFn: () => requestJson<{ staff: StaffStat[] }>("/api/activity?view=staff").then((r) => r.staff) });
  const perDay = useQuery({
    queryKey: ["uploads-per-day", user],
    enabled: !!user,
    queryFn: () => requestJson<{ days: DayCount[] }>(`/api/activity?view=perday&user=${user}&days=14`).then((r) => r.days),
  });
  const person = staff.data?.find((s) => s.user_id === user) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={person ? `${t("title")}: ${person.full_name || person.login_id}` : t("title")} subtitle={t("subtitle")} />
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {staff.data ? (
          <StaffList staff={staff.data} selected={user} onSelect={(id) => router.replace(id ? `${pathname}?user=${id}` : pathname, { scroll: false })} />
        ) : (
          <Skeleton className="h-96" />
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {person ? <StaffSummaryCards s={person} /> : null}
          {person && perDay.data ? <UploadsChart days={perDay.data} /> : null}
          <ActivityFilters value={filters} onChange={setFilters} user={user} />
          <ActivityTimeline user={user} filters={filters} />
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityView />
    </Suspense>
  );
}
