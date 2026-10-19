"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isEnabled } from "@/config/features";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";

/**
 * Sticky actions for the selected photos. "Add to calendar" appears with phase 6 and "Move to trash"
 * with phase 7 (both by feature flag; their routes come with those phases).
 */
export function SelectionBar({
  ids,
  onClear,
  onSelectPage,
  onDownload,
  onEdit,
  onChanged,
}: {
  ids: string[];
  onClear: () => void;
  onSelectPage: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const t = useT(galleryMessages);
  const router = useRouter();
  if (!ids.length) return null;

  async function trash() {
    try {
      await requestJson("/api/storage/trash", { method: "POST", body: { action: "trash", ids } });
      toast.success(t("trashed", { n: ids.length }));
      onClear();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background shadow-lg" role="region" aria-label={t("selected", { n: ids.length })}>
      <b aria-live="polite">{t("selected", { n: ids.length })}</b>
      <Button variant="link" className="h-auto px-1 text-background underline" onClick={onSelectPage}>
        {t("selectPage")}
      </Button>
      <span className="flex-1" />
      {isEnabled("calendar") ? (
        <Button
          className="min-h-10 bg-marigold font-bold text-[#14213a] hover:bg-marigold/90"
          onClick={() => router.push(`/admin/calendar?new=1&photos=${ids.slice(0, 50).join(",")}`)}
        >
          <CalendarPlus aria-hidden /> {t("addToCalendar")}
        </Button>
      ) : null}
      <Button variant="outline" className="min-h-10 border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background" onClick={onDownload}>
        <Download aria-hidden /> {t("download")}
      </Button>
      <Button variant="outline" className="min-h-10 border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background" onClick={onEdit}>
        <Pencil aria-hidden /> {t("editDetails")}
      </Button>
      {isEnabled("storage") ? (
        <Button variant="outline" className="min-h-10 border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background" onClick={trash}>
          <Trash2 aria-hidden /> {t("moveToTrash")}
        </Button>
      ) : null}
      <Button variant="ghost" className="min-h-10 text-background hover:bg-background/10 hover:text-background" onClick={onClear}>
        {t("clearSelection")}
      </Button>
    </div>
  );
}
