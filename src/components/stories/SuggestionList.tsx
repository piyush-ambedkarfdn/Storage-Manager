"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { SuggestionCard } from "@/components/stories/SuggestionCard";
import { isEnabled } from "@/config/features";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { StorySuggestion } from "@/types/story";

export function SuggestionList() {
  const t = useT(storiesMessages);
  const qc = useQueryClient();
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["story-suggestions"],
    queryFn: () => requestJson<{ suggestions: StorySuggestion[] }>("/api/stories/suggestions").then((r) => r.suggestions),
  });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["story-suggestions"] }), qc.invalidateQueries({ queryKey: ["stories"] })]);

  async function find() {
    setBusy(true);
    try {
      const { created } = await requestJson<{ created: number }>("/api/ai/story-suggestions", { method: "POST", body: { days } });
      toast.success(t("found", { n: created }));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isEnabled("ai") ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-10 w-56" aria-label={t("lastDays", { n: days })}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[30, 60, 90, 180].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("lastDays", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="min-h-10" onClick={find} disabled={busy}>
            <Sparkles aria-hidden /> {busy ? t("finding") : t("findIdeas")}
          </Button>
        </div>
      ) : null}
      {!data?.length ? (
        <EmptyState title={t("noSuggestions")} body={t("noSuggestionsBody")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <SuggestionCard key={s.id} s={s} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
