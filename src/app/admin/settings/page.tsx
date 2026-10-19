import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { settingsMessages } from "@/lib/i18n/messages/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsTabs, type SettingsTab } from "@/components/settings/SettingsTabs";

export const metadata: Metadata = { title: "Settings" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Kept here, not imported from SettingsTabs: that file is a client component ("use client"), and a
// server page only receives its components, not its plain values (arrays, objects, functions).
const TABS: readonly SettingsTab[] = ["places", "pending", "lists", "programs"];

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const t = await getT(settingsMessages);
  const tab = (await searchParams).tab;
  const initialTab: SettingsTab = typeof tab === "string" && (TABS as readonly string[]).includes(tab) ? (tab as SettingsTab) : "places";
  return (
    <div className="max-w-6xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Suspense>
        <SettingsTabs initialTab={initialTab} />
      </Suspense>
    </div>
  );
}