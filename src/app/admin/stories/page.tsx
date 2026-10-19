import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import { PageHeader } from "@/components/shared/PageHeader";
import { StoriesTabs } from "@/components/stories/StoriesTabs";

export const metadata: Metadata = { title: "Stories and campaigns" };

export default async function StoriesPage() {
  await requireAdmin();
  const t = await getT(storiesMessages);
  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Suspense>
        <StoriesTabs />
      </Suspense>
    </div>
  );
}
