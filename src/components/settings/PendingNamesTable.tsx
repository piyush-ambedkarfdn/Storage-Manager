"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, GitMerge, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { MergeDialog, type MergeSource } from "@/components/settings/MergeDialog";
import { requestJson } from "@/hooks/useOptions";
import { useInvalidatePlaces, usePlaces } from "@/hooks/usePlaces";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";
import { SIMILARITY, type ChildLevel, type Place, type SimilarName } from "@/types/places";

/** Names staff typed that were not in the list (approved = false), all levels together. */
export function usePendingNames() {
  const v = usePlaces("village", { pending: true, limit: 200 });
  const p = usePlaces("panchayat", { pending: true, limit: 200 });
  const b = usePlaces("block", { pending: true, limit: 200 });
  const items = [...(b.data?.items ?? []), ...(p.data?.items ?? []), ...(v.data?.items ?? [])];
  return { items, isLoading: v.isLoading || p.isLoading || b.isLoading };
}

function SimilarHint({ place }: { place: Place }) {
  const t = useT(settingsMessages);
  const { data } = useQuery({
    queryKey: ["similar", place.level, place.name, place.parent_id],
    queryFn: () => {
      const q = new URLSearchParams({ type: place.level, q: place.name });
      if (place.parent_id) q.set("parent", place.parent_id);
      return requestJson<{ matches: SimilarName[] }>(`/api/names/similar?${q}`);
    },
    staleTime: 60_000,
  });
  const others = (data?.matches ?? []).filter((m) => m.id !== place.id && m.score >= SIMILARITY.warn);
  if (!data) return null;
  return (
    <span className="text-xs text-muted-foreground">
      {others.length ? t("similarTo", { names: others.map((m) => m.name).join(", ") }) : t("noSimilar")}
    </span>
  );
}

export function PendingNamesTable() {
  const t = useT(settingsMessages);
  const invalidate = useInvalidatePlaces();
  const { items, isLoading } = usePendingNames();
  const [merging, setMerging] = useState<{ type: ChildLevel; from: MergeSource } | null>(null);
  const [deleting, setDeleting] = useState<Place | null>(null);

  async function approve(p: Place) {
    try {
      await requestJson(`/api/places/${p.level}/${p.id}`, { method: "PATCH", body: { approved: true } });
      toast.success(t("approvedToast", { name: p.name }));
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{t("pendingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("pendingBody")}</p>
      </div>
      {!isLoading && items.length === 0 ? (
        <EmptyState icon={<Inbox className="size-8" aria-hidden />} title={t("pendingNone")} body={t("pendingNoneBody")} />
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-56 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <ColorChip color="var(--marigold)" label={t(p.level as SettingsKey)} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {p.path}
                  {p.suggested_by_name ? ` · ${t("colSuggestedBy")}: ${p.suggested_by_name}` : ""}
                </div>
                <SimilarHint place={p} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-10" onClick={() => approve(p)}>
                  <Check aria-hidden /> {t("approve")}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-10"
                  onClick={() =>
                    setMerging({ type: p.level as ChildLevel, from: { id: p.id, name: p.name, parentId: p.parent_id, source: p.source } })
                  }
                >
                  <GitMerge aria-hidden /> {t("merge")}
                </Button>
                <Button variant="ghost" className="min-h-10 text-destructive" onClick={() => setDeleting(p)}>
                  <Trash2 aria-hidden /> {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <MergeDialog type={merging?.type ?? "village"} from={merging?.from ?? null} onOpenChange={(o) => !o && setMerging(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? t("deleteTitle", { name: deleting.name }) : ""}
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await requestJson(`/api/places/${deleting.level}/${deleting.id}`, { method: "DELETE" });
            toast.success(t("deleted", { name: deleting.name }));
            await invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </section>
  );
}
