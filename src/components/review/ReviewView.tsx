"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, FilterX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { RejectDialog } from "@/components/review/RejectDialog";
import { ReviewDownloadButton } from "@/components/review/ReviewDownloadButton";
import { ReviewPhotoDialog } from "@/components/review/ReviewPhotoDialog";
import { requestJson } from "@/hooks/useOptions";
import { useRefreshAfterReview, useReviewList } from "@/hooks/useReview";
import { filterReview, groupReview, hasReviewFilters, NO_REVIEW_FILTERS, NONE, reviewOptions, type ReviewFilters } from "@/lib/review/view";
import { useT } from "@/lib/i18n/provider";
import { reviewMessages } from "@/lib/i18n/messages/review";
import type { ReviewDecisionResult, ReviewPhoto } from "@/types/review";

const ALL = "__all__";

/** The Review page: photos waiting for approval, grouped Village > Activity type, with approve, reject and download. */
export function ReviewView() {
  const t = useT(reviewMessages);
  const query = useReviewList();
  const refresh = useRefreshAfterReview();
  const [filters, setFilters] = useState<ReviewFilters>(NO_REVIEW_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<ReviewPhoto | null>(null);
  const [approveIds, setApproveIds] = useState<string[]>([]);
  const [rejectIds, setRejectIds] = useState<string[]>([]);

  const photos = useMemo(() => query.data ?? [], [query.data]);
  const options = useMemo(() => reviewOptions(photos), [photos]);
  const shown = useMemo(() => filterReview(photos, filters), [photos, filters]);
  const groups = useMemo(() => groupReview(shown), [shown]);
  // only photos still on screen count as selected (a decision or a filter drops the others)
  const chosen = useMemo(() => shown.filter((p) => selected.has(p.id)).map((p) => p.id), [shown, selected]);
  const staffCount = useMemo(() => new Set(photos.map((p) => p.staff_id)).size, [photos]);
  const waitingText = (n: number) => (n === 1 ? t("waitingOne") : t("waiting", { n }));
  const set = (patch: Partial<ReviewFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const pick = (v: string | null) => v ?? ALL;
  const unpick = (v: string) => (v === ALL ? null : v);

  function toggle(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function decide(ids: string[], decision: "approve" | "reject", note?: string) {
    try {
      const r = await requestJson<ReviewDecisionResult>("/api/review/decide", { method: "POST", body: { ids, decision, note: note || undefined } });
      toast.success(decision === "approve" ? t("approved", { n: r.changed }) : t("rejected", { n: r.changed }));
      if (r.changed < r.requested) toast.info(t("alreadyDecided", { n: r.requested - r.changed }));
      toggle(ids, false);
      setOpened(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
        {query.error instanceof Error ? query.error.message : t("loadError")}
      </p>
    );
  }
  if (!photos.length) return <EmptyState title={t("nothing")} body={t("nothingBody")} />;

  const showFilters = options.staff.length > 1 || options.villages.length > 1 || options.activities.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <p className="text-sm" role="status">
          <span className="font-semibold">{waitingText(photos.length)}</span>
          <span className="text-muted-foreground"> · {t("waitingFrom", { n: staffCount })}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ReviewDownloadButton label={t("download")} />
          <Button className="min-h-10" disabled={!shown.length} onClick={() => setApproveIds(shown.map((p) => p.id))}>
            <Check aria-hidden /> {t("approveAll", { n: shown.length })}
          </Button>
        </div>
        <p className="w-full text-xs text-muted-foreground">{t("downloadHint")}</p>
      </div>

      {showFilters ? (
        <section className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
          {options.staff.length > 1 ? (
            <FilterSelect label={t("filterStaff")} value={pick(filters.staff)} onChange={(v) => set({ staff: unpick(v) })} all={t("all")}>
              {options.staff.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </FilterSelect>
          ) : null}
          <FilterSelect label={t("filterVillage")} value={pick(filters.village)} onChange={(v) => set({ village: unpick(v) })} all={t("all")}>
            {options.villages.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
            {options.noVillage ? <SelectItem value={NONE}>{t("noVillage")}</SelectItem> : null}
          </FilterSelect>
          <FilterSelect label={t("filterActivity")} value={pick(filters.activity)} onChange={(v) => set({ activity: unpick(v) })} all={t("all")}>
            {options.activities.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
            {options.noActivity ? <SelectItem value={NONE}>{t("noActivity")}</SelectItem> : null}
          </FilterSelect>
          {hasReviewFilters(filters) ? (
            <Button variant="outline" className="h-10" onClick={() => setFilters(NO_REVIEW_FILTERS)}>
              <FilterX aria-hidden /> {t("clear")}
            </Button>
          ) : null}
        </section>
      ) : null}

      {/* choosing photos: stays in view while scrolling */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 p-2 backdrop-blur">
        <Button variant="outline" size="sm" className="min-h-9" onClick={() => toggle(shown.map((p) => p.id), chosen.length !== shown.length)}>
          {chosen.length === shown.length && shown.length > 0 ? t("clearSelection") : t("selectAll")}
        </Button>
        {chosen.length ? (
          <>
            <span className="text-sm font-medium">{t("selected", { n: chosen.length })}</span>
            <Button size="sm" className="min-h-9" onClick={() => setApproveIds(chosen)}>
              <Check aria-hidden /> {t("approveSelected")}
            </Button>
            <Button size="sm" variant="destructive" className="min-h-9" onClick={() => setRejectIds(chosen)}>
              <X aria-hidden /> {t("rejectSelected")}
            </Button>
            <ReviewDownloadButton photoIds={chosen} label={t("downloadSelected")} className="min-h-9" />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((v) => (
          <section key={v.key} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
            <h2 className="flex items-baseline gap-2 text-base font-bold">
              {v.village ?? t("noVillage")}
              {v.district ? <span className="text-xs font-normal text-muted-foreground">({v.district})</span> : null}
              <span className="text-xs font-normal text-muted-foreground">{waitingText(v.count)}</span>
            </h2>
            {v.activities.map((a) => {
              const ids = a.photos.map((p) => p.id);
              const all = ids.every((id) => selected.has(id));
              return (
                <div key={a.key} className="flex flex-col gap-2 border-l-2 border-primary/40 pl-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Checkbox checked={all} onCheckedChange={(c) => toggle(ids, c === true)} aria-label={`${t("selectAll")}: ${a.activity ?? t("noActivity")}`} />
                    {a.activity ?? t("noActivity")}
                    <span className="text-xs font-normal text-muted-foreground">{a.photos.length}</span>
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {a.photos.map((p) => (
                      <li key={p.id} className="flex flex-col gap-1">
                        <div className={`relative overflow-hidden rounded-md ${selected.has(p.id) ? "ring-3 ring-marigold" : ""}`}>
                          <button type="button" className="block w-full" onClick={() => setOpened(p)} aria-label={`${t("open")}: ${p.staff_name ?? ""}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- small cached thumbnails from our storage */}
                            <img src={p.thumbUrl} alt={p.note ?? ""} loading="lazy" className="aspect-square w-full bg-photo-surface object-cover" />
                          </button>
                          <span className="absolute top-1 left-1 rounded-full bg-background/90 p-1">
                            <Checkbox checked={selected.has(p.id)} onCheckedChange={(c) => toggle([p.id], c === true)} aria-label={t("selectPhoto")} />
                          </span>
                          {p.consent !== "yes" || p.has_children ? <span className="absolute right-1 bottom-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-900">!</span> : null}
                        </div>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {p.staff_name ?? "—"}
                          {p.event_date ? ` · ${format(new Date(p.event_date + "T00:00:00"), "d MMM")}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <ReviewPhotoDialog photo={opened} onClose={() => setOpened(null)} onApprove={(p) => void decide([p.id], "approve")} onReject={(p) => setRejectIds([p.id])} />
      <ConfirmDialog
        open={approveIds.length > 0}
        onOpenChange={(o) => !o && setApproveIds([])}
        title={t("approveTitle", { n: approveIds.length })}
        body={t("approveBody")}
        confirmLabel={t("approve")}
        onConfirm={() => decide(approveIds, "approve")}
      />
      <RejectDialog count={rejectIds.length} onCancel={() => setRejectIds([])} onConfirm={async (note) => { await decide(rejectIds, "reject", note); setRejectIds([]); }} />
    </div>
  );
}

function FilterSelect({ label, value, onChange, all, children }: { label: string; value: string; onChange: (v: string) => void; all: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{all}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </label>
  );
}
