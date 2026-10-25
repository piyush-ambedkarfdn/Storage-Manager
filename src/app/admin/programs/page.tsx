import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { programViewMessages } from "@/lib/i18n/messages/program-view";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProgramView } from "@/components/program/ProgramView";

export const metadata: Metadata = { title: "Program" };

export default async function ProgramsPage() {
  await requireAdmin();
  const t = await getT(programViewMessages);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {/* like the gallery, this page keeps its choice in the address */}
      <Suspense>
        <ProgramView />
      </Suspense>
    </div>
  );
}
