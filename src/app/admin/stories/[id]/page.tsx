import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getStoryDetail } from "@/lib/stories/queries";
import { StoryEditor } from "@/components/stories/StoryEditor";

export const metadata: Metadata = { title: "Story" };

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await getStoryDetail(session, id).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!detail) notFound();
  return <StoryEditor key={id} initial={detail} />;
}
