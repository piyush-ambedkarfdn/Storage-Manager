import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { optionalEnv } from "@/lib/env";
import { getUsageToday } from "@/lib/ai/throttle";
import { getT } from "@/lib/i18n/server";
import { aiMessages } from "@/lib/i18n/messages/ai";
import { PageHeader } from "@/components/shared/PageHeader";
import { AiUsageCard } from "@/components/ai/AiUsageCard";
import { DescribeUntaggedCard } from "@/components/ai/DescribeUntaggedCard";
import { SummarizeUntaggedCard } from "@/components/ai/SummarizeUntaggedCard";

export const metadata: Metadata = { title: "AI tools" };
export const dynamic = "force-dynamic";

export default async function AiPage() {
  await requireAdmin();
  const t = await getT(aiMessages);
  const usage = await getUsageToday();
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <AiUsageCard usage={usage} ready={!!optionalEnv("GEMINI_API_KEY")} />
      <div className="grid gap-4 md:grid-cols-2">
        <SummarizeUntaggedCard />
        <DescribeUntaggedCard />
      </div>
    </div>
  );
}
