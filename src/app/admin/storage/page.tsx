"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { CleanupPreview } from "@/components/storage/CleanupPreview";
import { GoogleConnectCard } from "@/components/storage/GoogleConnectCard";
import { MoveStoragePanel } from "@/components/storage/MoveStoragePanel";
import { ProviderCard, useProviderStatus } from "@/components/storage/ProviderCard";
import { StorageSettingsCard } from "@/components/storage/StorageSettingsCard";
import { TrashTable } from "@/components/storage/TrashTable";
import { ProviderUsageCard } from "@/components/storage/UsageMeter";
import { requestJson } from "@/hooks/useOptions";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import { storageMessages, type StorageKey } from "@/lib/i18n/messages/storage";
import type { StorageSettings, UploadRate } from "@/types/cleanup";

const RESULTS = ["connected", "cancelled", "expired", "no-refresh-token", "other-account", "not-configured", "failed"];

function GoogleResult() {
  const ts = useT(storageMessages);
  const google = useSearchParams().get("google");
  if (!google || !RESULTS.includes(google)) return null;
  return (
    <p role="status" className={google === "connected" ? "rounded-md border border-success bg-success/10 px-3 py-2 text-sm" : "rounded-md border border-marigold bg-marigold/15 px-3 py-2 text-sm"}>
      {ts(`g_${google}` as StorageKey)}
    </p>
  );
}

/**
 * Storage manager (phase 7, replaces the phase 4 page). Admins only: the admin layout checks the role,
 * and every API it calls checks again.
 */
export default function StoragePage() {
  const t = useT(cleanupMessages);
  const usage = useStorageUsage();
  const status = useProviderStatus();
  const settings = useQuery({
    queryKey: ["storage-settings"],
    queryFn: () => requestJson<{ settings: StorageSettings; rate30: UploadRate[] }>("/api/storage/settings"),
  });
  const rate = (p: string) => settings.data?.rate30.find((r) => r.provider === p)?.bytes ?? 0;

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Suspense>
        <GoogleResult />
      </Suspense>
      <ProviderCard />
      {usage.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {usage.data.providers.map((p) => (
            <ProviderUsageCard key={p.provider} usage={p} thresholds={usage.data.thresholds} bytesLast30={rate(p.provider)} />
          ))}
        </div>
      ) : (
        <Skeleton className="h-40" />
      )}
      {settings.data ? (
        <StorageSettingsCard key={JSON.stringify(settings.data.settings)} settings={settings.data.settings} />
      ) : null}
      <CleanupPreview trashDays={settings.data?.settings.trash_days ?? 30} />
      <TrashTable />
      <MoveStoragePanel r2Ready={!!status.data?.r2.configured} gdriveReady={!!status.data?.gdrive.configured} />
      <GoogleConnectCard />
    </div>
  );
}
