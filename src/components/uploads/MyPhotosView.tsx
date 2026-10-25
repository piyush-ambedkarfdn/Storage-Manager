"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MyDownloadButton } from "@/components/uploads/MyDownloadButton";
import { requestJson } from "@/hooks/useOptions";
import { filterOptions, filterPhotos, groupPhotos, hasFilters, NO_FILTERS, NONE, type MyPhotoFilters } from "@/lib/uploads/my-photos-view";
import { useT } from "@/lib/i18n/provider";
import { myPhotosMessages } from "@/lib/i18n/messages/my-photos";
import type { MyPhoto } from "@/types/my-photos";

const ALL = "__all__";

/** My uploads by date: Date > Activity type > Village > photos, with filters at the top. */
export function MyPhotosView() {
  const t = useT(myPhotosMessages);
  const [filters, setFilters] = useState<MyPhotoFilters>(NO_FILTERS);
  const query = useQuery({ queryKey: ["my-photos"], queryFn: () => requestJson<{ photos: MyPhoto[] }>("/api/my-photos").then((r) => r.photos) });
  const photos = useMemo(() => query.data ?? [], [query.data]);
  const options = useMemo(() => filterOptions(photos), [photos]);
  const shown = useMemo(() => filterPhotos(photos, filters), [photos, filters]);
  const groups = useMemo(() => groupPhotos(shown), [shown]);
  const set = (patch: Partial<MyPhotoFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = hasFilters(filters);

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
        {t("loadError")}
      </p>
    );
  }
  if (!photos.length) return <EmptyState title={t("emptyAll")} />;

  const pick = (value: string | null) => value ?? ALL;
  const unpick = (v: string) => (v === ALL ? null : v);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={t("filters")} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t("from")}
          <Input type="date" className="h-10 w-40" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t("to")}
          <Input type="date" className="h-10 w-40" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </label>
        {options.programs.length > 1 ? (
          <FilterSelect label={t("program")} value={pick(filters.program)} onChange={(v) => set({ program: unpick(v) })} allLabel={t("all")}>
            {options.programs.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </FilterSelect>
        ) : null}
        <FilterSelect label={t("activity")} value={pick(filters.activity)} onChange={(v) => set({ activity: unpick(v) })} allLabel={t("all")}>
          {options.activities.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
          {options.noActivity ? <SelectItem value={NONE}>{t("noActivity")}</SelectItem> : null}
        </FilterSelect>
        <FilterSelect label={t("village")} value={pick(filters.village)} onChange={(v) => set({ village: unpick(v) })} allLabel={t("all")}>
          {options.villages.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
          {options.noVillage ? <SelectItem value={NONE}>{t("noVillage")}</SelectItem> : null}
        </FilterSelect>
        {filtered ? (
          <Button type="button" variant="outline" className="h-10" onClick={() => setFilters(NO_FILTERS)}>
            <FilterX aria-hidden /> {t("clear")}
          </Button>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" role="status">
          {filtered ? t("countOf", { n: shown.length, total: photos.length }) : t("count", { n: photos.length })}
          {photos.length >= 2000 ? ` · ${t("capNote", { n: 2000 })}` : ""}
        </p>
        {shown.length ? (
          <MyDownloadButton photoIds={shown.map((p) => p.id)} label={filtered ? t("downloadFiltered", { n: shown.length }) : t("downloadAll")} className="min-h-10" />
        ) : null}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((d) => (
            <section key={d.key} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <h2 className="flex items-baseline gap-2 text-base font-bold">
                {d.date ? format(new Date(d.date + "T00:00:00"), "d MMM yyyy") : t("noDate")}
                <span className="text-xs font-normal text-muted-foreground">{t("count", { n: d.count })}</span>
              </h2>
              {d.activities.map((a) => (
                <div key={a.key} className="flex flex-col gap-2 border-l-2 border-primary/40 pl-3">
                  <h3 className="flex items-baseline gap-2 text-sm font-semibold">
                    {a.activity ?? t("noActivity")}
                    <span className="text-xs font-normal text-muted-foreground">{a.count}</span>
                  </h3>
                  {a.villages.map((v) => (
                    <div key={v.key} className="flex flex-col gap-1.5 pl-2">
                      <h4 className="text-xs font-semibold text-muted-foreground">
                        {v.village ?? t("noVillage")} · {v.photos.length}
                      </h4>
                      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {v.photos.map((p) => (
                          <li key={p.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- small cached thumbnails from our storage */}
                            <img src={p.thumbUrl} alt={p.note ?? ""} loading="lazy" className="aspect-square w-full rounded-md bg-photo-surface object-cover" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, allLabel, children }: { label: string; value: string; onChange: (v: string) => void; allLabel: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </label>
  );
}
