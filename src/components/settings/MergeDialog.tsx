"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson, useInvalidateOptions } from "@/hooks/useOptions";
import { useInvalidatePlaces } from "@/hooks/usePlaces";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";
import { commonMessages } from "@/lib/i18n/messages/common";
import { PARENT_LEVEL, SIMILARITY, type MergeType, type PlaceList, type SimilarName } from "@/types/places";

export type MergeSource = { id: string; name: string; parentId?: string | null; source?: "lgd" | "user" };
type Candidate = { id: string; name: string; note: string };

/**
 * Merge a duplicate (a spelling mistake, a staff suggestion) into the right record.
 * Suggests near-duplicates first (find_similar_names), and also searches by name.
 */
export function MergeDialog({
  type,
  from,
  onOpenChange,
  onMerged,
}: {
  type: MergeType;
  /** null = closed */
  from: MergeSource | null;
  onOpenChange: (open: boolean) => void;
  onMerged?: () => void;
}) {
  return (
    <Dialog open={from !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {from ? <MergeBody key={from.id} type={type} from={from} onOpenChange={onOpenChange} onMerged={onMerged} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MergeBody({
  type,
  from,
  onOpenChange,
  onMerged,
}: {
  type: MergeType;
  from: MergeSource;
  onOpenChange: (open: boolean) => void;
  onMerged?: () => void;
}) {
  const t = useT(settingsMessages);
  const tc = useT(commonMessages);
  const invalidatePlaces = useInvalidatePlaces();
  const invalidateOptions = useInvalidateOptions();
  const [q, setQ] = useState(from.name);
  const query = useDeferredValue(q.trim());
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const levelLabel = t(type as SettingsKey);
  const parentLabel = type === "program" ? "" : t(PARENT_LEVEL[type] as SettingsKey);

  const similar = useQuery({
    queryKey: ["similar", type, query, from.parentId ?? null],
    enabled: query.length > 0,
    queryFn: () => {
      const p = new URLSearchParams({ type, q: query });
      if (from.parentId) p.set("parent", from.parentId);
      return requestJson<{ matches: SimilarName[] }>(`/api/names/similar?${p}`);
    },
  });
  const search = useQuery({
    queryKey: ["merge-search", type, query],
    enabled: query.length > 1 && type !== "program",
    queryFn: () =>
      requestJson<PlaceList>(`/api/places?${new URLSearchParams({ level: type, q: query, limit: "10" })}`),
  });

  const suggested: Candidate[] = (similar.data?.matches ?? [])
    .filter((m) => m.id !== from.id)
    .map((m) => ({
      id: m.id,
      name: m.name,
      note: [
        m.score >= SIMILARITY.exact ? t("mergeSameSpelling") : t("mergeSimilar", { pct: Math.round(m.score * 100) }),
        from.parentId && !m.sameParent ? t("mergeOtherParent", { parent: parentLabel }) : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const seen = new Set(suggested.map((s) => s.id));
  const results: Candidate[] = (search.data?.items ?? [])
    .filter((p) => p.id !== from.id && !seen.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, note: p.path }));

  async function merge() {
    if (!picked) return;
    setBusy(true);
    try {
      await requestJson("/api/places/merge", { method: "POST", body: { type, from: from.id, into: picked.id } });
      toast.success(t("mergeDone", { name: picked.name }));
      await (type === "program" ? invalidateOptions("program") : invalidatePlaces());
      onMerged?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const list = (title: string, items: Candidate[]) =>
    items.length ? (
      <div>
        <div className="mb-1 text-xs font-semibold text-muted-foreground">{title}</div>
        <ul className="flex flex-col gap-1" role="listbox" aria-label={title}>
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={picked?.id === c.id}
                onClick={() => setPicked(c)}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start rounded-md border px-3 py-1.5 text-left hover:bg-secondary",
                  picked?.id === c.id && "border-marigold bg-marigold/10",
                )}
              >
                <span className="font-semibold">{c.name}</span>
                {c.note ? <span className="text-xs text-muted-foreground">{c.note}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("mergeTitle", { name: from.name, level: levelLabel })}</DialogTitle>
        <DialogDescription>{t("mergeBody", { name: from.name, level: levelLabel })}</DialogDescription>
      </DialogHeader>
      {from.source === "lgd" ? (
        <p className="rounded-md border border-marigold bg-marigold/10 px-3 py-2 text-sm">{t("mergeLgdWarn", { name: from.name })}</p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="merge-q">{t("mergeSearch", { level: levelLabel })}</Label>
        <Input id="merge-q" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-3">
        {list(t("mergeSuggested"), suggested)}
        {list(t("mergeResults"), results)}
        {!suggested.length && !results.length ? <p className="text-sm text-muted-foreground">{t("mergeNothing")}</p> : null}
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {tc("cancel")}
        </Button>
        <Button className="min-h-11" onClick={merge} disabled={!picked || busy}>
          {busy ? tc("loading") : picked ? t("mergeConfirm", { name: picked.name }) : t("merge")}
        </Button>
      </DialogFooter>
    </>
  );
}
