"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import type { ContentSummary } from "@/types/content";

export function LibraryStats({ library }: { library: ContentSummary["library"] }) {
  const t = useT(dashboardMessages);
  const row = (label: string, value: number, href?: string) => (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <b className="tabular-nums">{value.toLocaleString("en-IN")}</b>
        {href && value > 0 ? (
          <Link href={href} className="text-xs font-semibold text-primary hover:underline">
            {t("review")}
          </Link>
        ) : null}
      </span>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 text-sm">
      {row(t("uploadsWeek"), library.uploadsThisWeek)}
      {row(t("photosTotal"), library.photosTotal)}
      {row(t("notUsed"), library.photosUnused, "/admin/gallery?unused=1")}
      {row(t("namesPending"), library.namesPending, "/admin/settings?tab=pending")}
    </div>
  );
}
