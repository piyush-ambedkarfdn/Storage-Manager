"use client";

import { MyPhotosView } from "@/components/uploads/MyPhotosView";
import { MyReportsList } from "@/components/uploads/MyReportsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";
import { myPhotosMessages } from "@/lib/i18n/messages/my-photos";

/** My uploads: photos by date > activity type > village (with filters), or the reports as written. */
export function MyUploadsTabs() {
  const t = useT(myPhotosMessages);
  return (
    <Tabs defaultValue="date" className="gap-4">
      <TabsList>
        <TabsTrigger value="date" className="min-h-9 px-4">
          {t("tabDate")}
        </TabsTrigger>
        <TabsTrigger value="reports" className="min-h-9 px-4">
          {t("tabReports")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="date">
        <MyPhotosView />
      </TabsContent>
      <TabsContent value="reports">
        <MyReportsList />
      </TabsContent>
    </Tabs>
  );
}
