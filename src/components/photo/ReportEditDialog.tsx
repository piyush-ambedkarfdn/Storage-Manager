"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { photoMessages, type PhotoKey } from "@/lib/i18n/messages/photo";
import { commonMessages } from "@/lib/i18n/messages/common";
import { REPORT_PART_KEYS, type ReportParts } from "@/types/report";
import type { ReportDetail } from "@/types/photo-detail";

/**
 * mode "staff": fix typos in the four staff answers (old text kept in the activity log).
 * mode "ai": edit the AI version, then accept it.
 */
export function ReportEditDialog({
  mode,
  report,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "staff" | "ai";
  report: ReportDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {open ? <Body mode={mode} report={report} onOpenChange={onOpenChange} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({ mode, report, onOpenChange, onSaved }: { mode: "staff" | "ai"; report: ReportDetail; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const t = useT(photoMessages);
  const tc = useT(commonMessages);
  const [parts, setParts] = useState<ReportParts>({
    what_happened: report.report_parts?.what_happened ?? report.report ?? "",
    problem: report.report_parts?.problem ?? "",
    who_affected: report.report_parts?.who_affected ?? "",
    result: report.report_parts?.result ?? "",
  });
  const [aiText, setAiText] = useState(report.ai_report_en ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      if (mode === "staff") {
        await requestJson(`/api/reports/${report.id}`, { method: "PATCH", body: { report_parts: parts } });
        toast.success(t("saved"));
      } else {
        await requestJson(`/api/reports/${report.id}/review`, { method: "POST", body: { action: "accept", text: aiText } });
        toast.success(t("accepted"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "staff" ? t("editStaffTitle") : t("editAiTitle")}</DialogTitle>
        <DialogDescription>{mode === "staff" ? t("editStaffHint") : t("editAiHint")}</DialogDescription>
      </DialogHeader>
      {mode === "staff" ? (
        <div className="flex flex-col gap-3">
          {REPORT_PART_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-${k}`}>{t(`q_${k}` as PhotoKey)}</Label>
              <Textarea id={`edit-${k}`} value={parts[k]} onChange={(e) => setParts({ ...parts, [k]: e.target.value })} rows={3} maxLength={2000} />
            </div>
          ))}
        </div>
      ) : (
        <Textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={12} maxLength={8000} aria-label={t("tabAi")} />
      )}
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {tc("cancel")}
        </Button>
        <Button className="min-h-11" onClick={save} disabled={busy || (mode === "staff" ? !parts.what_happened.trim() : !aiText.trim())}>
          {busy ? tc("loading") : mode === "staff" ? t("save") : t("accept")}
        </Button>
      </DialogFooter>
    </>
  );
}
