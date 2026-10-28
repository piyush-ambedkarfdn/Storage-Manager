import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { reviewMessages } from "@/lib/i18n/messages/review";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReviewView } from "@/components/review/ReviewView";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  await requireAdmin();
  const t = await getT(reviewMessages);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ReviewView />
    </div>
  );
}
