"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { StorySuggestion } from "@/types/story";

const KIND_COLOR = { impact_story: "var(--primary)", case_study: "var(--success)", campaign: "var(--marigold-ink)" } as const;

/** One AI suggestion: the problem, where it was reported, why now, and the reports behind it. */
export function SuggestionCard({ s, onChanged }: { s: StorySuggestion; onChanged: () => void }) {
  const t = useT(storiesMessages);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "accept" | "dismiss") {
    setBusy(true);
    try {
      const r = await requestJson<{ storyId?: string }>(`/api/stories/suggestions/${s.id}`, { method: "PATCH", body: { action } });
      onChanged();
      if (r.storyId) router.push(`/admin/stories/${r.storyId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ColorChip color={KIND_COLOR[s.kind]} label={t(`kind_${s.kind}`)} />
        <span className="text-xs text-muted-foreground">{t("basedOn", { n: s.report_ids.length })}</span>
      </div>
      <b className="text-base">{s.title}</b>
      {s.problem ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("problem")}:</span> {s.problem}
        </p>
      ) : null}
      {s.places ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("where")}:</span> {s.places}
        </p>
      ) : null}
      {s.why_now ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("whyNow")}:</span> {s.why_now}
        </p>
      ) : null}
      {s.suggested_window ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("window")}:</span> {s.suggested_window}
        </p>
      ) : null}
      <div className="mt-1 flex gap-2">
        <Button className="min-h-10" onClick={() => act("accept")} disabled={busy}>
          {t("accept")}
        </Button>
        <Button variant="outline" className="min-h-10" onClick={() => act("dismiss")} disabled={busy}>
          {t("dismiss")}
        </Button>
      </div>
    </article>
  );
}
