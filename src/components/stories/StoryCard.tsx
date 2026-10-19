"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ColorChip } from "@/components/shared/ColorChip";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { Story } from "@/types/story";

export const STATUS_COLOR = { idea: "#7A8AA3", draft: "#D99A1E", ready: "#2E9E6B", published: "#3B7DD8" } as const;

export function StoryCard({ story }: { story: Story }) {
  const t = useT(storiesMessages);
  return (
    <Link href={`/admin/stories/${story.id}`} className="flex gap-3 rounded-lg border bg-card p-3 hover:border-primary">
      {story.first_thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- cached thumbnail
        <img src={story.first_thumb} alt="" className="size-20 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="size-20 shrink-0 rounded-md bg-photo-surface" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <ColorChip color={STATUS_COLOR[story.status]} label={t(`status_${story.status}`)} />
          {story.ai_generated && !story.reviewed_at ? <span className="text-xs text-marigold-ink">{t("aiWritten")}</span> : null}
        </div>
        <b className="truncate">{story.title}</b>
        {story.summary ? <p className="line-clamp-2 text-sm text-muted-foreground">{story.summary}</p> : null}
        <span className="text-xs text-muted-foreground">
          {t("updated", { date: format(new Date(story.updated_at), "d MMM yyyy") })} · {t("photos", { n: story.photo_count ?? 0 })}
        </span>
      </div>
    </Link>
  );
}
