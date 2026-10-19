"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatBytes } from "@/components/storage/StorageOverview";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import type { ApplyResult, TrashItem } from "@/types/cleanup";

/** The trash: restore, or delete for good now (otherwise the daily purge does it after the trash window). */
export function TrashTable() {
  const t = useT(cleanupMessages);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["trash"], queryFn: () => requestJson<{ items: TrashItem[]; trashDays: number }>("/api/storage/trash") });
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const items = data?.items ?? [];
  const refresh = () => Promise.all(["trash", "storage-usage", "gallery", "gallery-tree"].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  async function act(action: "restore" | "delete_now") {
    try {
      const r = await requestJson<ApplyResult>("/api/storage/trash", { method: "POST", body: { action, ids: selected } });
      toast.success(action === "restore" ? t("restored", { n: r.done }) : t("deletedNow", { n: r.done }));
      if (r.failed?.length) toast.error(t("someFailed", { n: r.failed.length }));
      setSelected([]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t("trashTitle", { n: items.length })}</h2>
          <p className="text-sm text-muted-foreground">{t("trashHint", { days: data?.trashDays ?? 30 })}</p>
        </div>
        {items.length ? (
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-10" disabled={!selected.length} onClick={() => act("restore")}>
              {t("restore")}
            </Button>
            <Button variant="outline" className="min-h-10 border-destructive text-destructive" disabled={!selected.length} onClick={() => setConfirmDelete(true)}>
              {t("deleteNow")}
            </Button>
          </div>
        ) : null}
      </div>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">{t("trashEmpty")}</p>
      ) : (
        <div className="max-h-96 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                <th className="w-10 px-2 py-2">
                  <Checkbox
                    aria-label={t("selectAll")}
                    checked={selected.length === items.length ? true : selected.length ? "indeterminate" : false}
                    onCheckedChange={(c) => setSelected(c ? items.map((i) => i.id) : [])}
                  />
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="sr-only">Photo</span>
                </th>
                <th className="px-2 py-2 text-left">{t("colWhere")}</th>
                <th className="px-2 py-2 text-left">{t("colPurge")}</th>
                <th className="px-2 py-2 text-right">{t("colSize")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-2 py-1.5">
                    <Checkbox
                      aria-label={i.village_name ?? i.id}
                      checked={selected.includes(i.id)}
                      onCheckedChange={(c) => setSelected(c ? [...selected, i.id] : selected.filter((x) => x !== i.id))}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
                    <img src={i.thumbUrl} alt="" className="size-10 rounded object-cover" loading="lazy" />
                  </td>
                  <td className="px-2 py-1.5">
                    {i.village_name ?? "—"} <span className="text-muted-foreground">{i.event_date}</span>
                  </td>
                  <td className="px-2 py-1.5">{format(new Date(i.purgeOn), "d MMM yyyy")}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatBytes(i.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deletedNowTitle", { n: selected.length })}
        body={t("deletedNowBody")}
        confirmLabel={t("deleteNow")}
        destructive
        onConfirm={() => act("delete_now")}
      />
    </section>
  );
}
