"use client";

import { BacklogCard } from "@/components/ai/SummarizeUntaggedCard";

/** Photos uploaded before AI (or that could not be described yet), consented and without children only. */
export function DescribeUntaggedCard() {
  return <BacklogCard endpoint="/api/ai/describe-untagged" titleKey="photosTitle" bodyKey="photosBody" queryKey="ai-photos-backlog" />;
}
