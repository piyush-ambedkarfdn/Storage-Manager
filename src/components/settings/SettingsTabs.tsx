"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTypesCard } from "@/components/settings/ActivityTypesCard";
import { LgdImportCard } from "@/components/settings/LgdImportCard";
import { OptionsOverview } from "@/components/settings/OptionsOverview";
import { PendingNamesTable, usePendingNames } from "@/components/settings/PendingNamesTable";
import { PlacesTable } from "@/components/settings/PlacesTable";
import { ProgramsManager } from "@/components/settings/ProgramsManager";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages } from "@/lib/i18n/messages/settings";

export const SETTINGS_TABS = ["places", "pending", "lists", "programs"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** Settings sections. The open tab is kept in ?tab= so it can be linked to and survives a reload. */
export function SettingsTabs({ initialTab }: { initialTab: SettingsTab }) {
  const t = useT(settingsMessages);
  const router = useRouter();
  const params = useSearchParams();
  const { items: pending } = usePendingNames();

  function onChange(tab: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    router.replace(`?${next}`, { scroll: false });
  }

  return (
    <Tabs defaultValue={initialTab} onValueChange={onChange} className="gap-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="places" className="min-h-9">
          {t("tabPlaces")}
        </TabsTrigger>
        <TabsTrigger value="pending" className="min-h-9">
          {t("tabPending")}
          {pending.length ? (
            <span className="ml-1.5 rounded-full bg-marigold px-1.5 text-xs font-bold text-[#14213a]">{pending.length}</span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="lists" className="min-h-9">
          {t("tabLists")}
        </TabsTrigger>
        <TabsTrigger value="programs" className="min-h-9">
          {t("tabPrograms")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="places" className="flex flex-col gap-4">
        <LgdImportCard />
        <PlacesTable />
      </TabsContent>
      <TabsContent value="pending">
        <PendingNamesTable />
      </TabsContent>
      <TabsContent value="lists" className="flex flex-col gap-4">
        <OptionsOverview />
        <ActivityTypesCard />
      </TabsContent>
      <TabsContent value="programs">
        <ProgramsManager />
      </TabsContent>
    </Tabs>
  );
}
