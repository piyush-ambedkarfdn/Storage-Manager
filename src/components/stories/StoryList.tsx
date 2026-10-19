"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StoryCard } from "@/components/stories/StoryCard";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { Story, StoryKind } from "@/types/story";

export function StoryList({ kind }: { kind: StoryKind }) {
  const t = useT(storiesMessages);
  const { data, isLoading } = useQuery({
    queryKey: ["stories", kind],
    queryFn: () => requestJson<{ stories: Story[] }>(`/api/stories?kind=${kind}`).then((r) => r.stories),
  });
  if (isLoading) return <Skeleton className="h-40" />;
  if (!data?.length) return <EmptyState title={t("empty")} body={t("emptyBody")} />;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.map((s) => (
        <li key={s.id}>
          <StoryCard story={s} />
        </li>
      ))}
    </ul>
  );
}
