"use client";

import Link from "next/link";
import { UsageMeter } from "@/components/storage/StorageOverview";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { useT } from "@/lib/i18n/provider";
import { dashboardMessages } from "@/lib/i18n/messages/dashboard";
import { storageMessages } from "@/lib/i18n/messages/storage";

/** Usage of each configured storage, with the active one marked, and a link to the storage page. */
export function StorageSummary() {
  const t = useT(dashboardMessages);
  const ts = useT(storageMessages);
  const { data } = useStorageUsage();
  if (!data) return null;
  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      {data.providers
        .filter((p) => p.configured)
        .map((p) => (
          <div key={p.provider}>
            <div className="mb-1 text-sm font-semibold">
              {ts(p.provider)} {p.active ? <span className="text-xs text-success">· {t("active")}</span> : null}
            </div>
            <UsageMeter usage={p} thresholds={data.thresholds} />
          </div>
        ))}
      <Link href="/admin/storage" className="text-sm font-semibold text-primary hover:underline">
        {t("manageStorage")}
      </Link>
    </div>
  );
}
