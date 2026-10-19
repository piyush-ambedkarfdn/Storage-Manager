"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AiAssistPanel } from "@/components/calendar/AiAssistPanel";
import { ConsentWarnings } from "@/components/calendar/ConsentWarnings";
import { ItemFields, type ItemDraft } from "@/components/calendar/NewItemDialog";
import { PhotoStrip } from "@/components/calendar/PhotoStrip";
import { ReportContext } from "@/components/calendar/ReportContext";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { ContentItem, PhotosInfo } from "@/types/content";

type Loaded = { item: ContentItem } & PhotosInfo;

/** Side panel for one post: every field, its photos, the reports behind them, AI help, delete. */
export function ItemPanel({ itemId, onClose, onChanged }: { itemId: string | null; onClose: () => void; onChanged: () => void }) {
  const t = useT(calendarMessages);
  return (
    <Sheet open={itemId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t("editTitle")}</SheetTitle>
          <SheetDescription className="sr-only">{t("editTitle")}</SheetDescription>
        </SheetHeader>
        {itemId ? <Body key={itemId} id={itemId} onClose={onClose} onChanged={onChanged} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const t = useT(calendarMessages);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["content-item", id], queryFn: () => requestJson<Loaded>(`/api/content/${id}`) });
  const [edits, setEdits] = useState<Partial<ItemDraft>>({});
  const [confirmed, setConfirmed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!data) return <Skeleton className="mx-4 h-96" />;

  const value: ItemDraft = { ...data.item, ...edits };
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["content-item", id] });
    onChanged();
  };

  async function save() {
    if (!value.title?.trim()) return toast.error(t("titleRequired"));
    setBusy(true);
    try {
      await requestJson(`/api/content/${id}`, { method: "PATCH", body: edits });
      toast.success(t("saved"));
      setEdits({});
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function setPhotos(ids: string[]) {
    try {
      await requestJson(`/api/content/${id}/photos`, { method: "PUT", body: { photo_ids: ids } });
      setConfirmed(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }
  const ids = data.photos.map((p) => p.id);

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <ItemFields value={value} onChange={(patch) => setEdits((e) => ({ ...e, ...patch }))} />
      <div className="flex gap-2">
        <Button className="min-h-11" onClick={save} disabled={busy || !Object.keys(edits).length}>
          {busy ? t("saving") : t("save")}
        </Button>
        <Button variant="ghost" className="min-h-11 text-destructive" onClick={() => setDeleting(true)}>
          <Trash2 aria-hidden /> {t("deleteItem")}
        </Button>
      </div>
      <PhotoStrip photos={data.photos} onRemove={(pid) => setPhotos(ids.filter((x) => x !== pid))} onAdd={(add) => setPhotos([...new Set([...ids, ...add])])} />
      <ConsentWarnings photos={data.photos} confirmed={confirmed} onConfirm={setConfirmed} onRemove={(pid) => setPhotos(ids.filter((x) => x !== pid))} />
      <ReportContext reports={data.reports} />
      <AiAssistPanel
        photoIds={ids}
        title={value.title ?? ""}
        platform={value.platform}
        format={value.content_format}
        goal={value.goal}
        onUse={(field, text) => setEdits((e) => ({ ...e, [field]: text }))}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={t("deleteItem")}
        destructive
        onConfirm={async () => {
          try {
            await requestJson(`/api/content/${id}`, { method: "DELETE" });
            toast.success(t("deleted"));
            onChanged();
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </div>
  );
}
