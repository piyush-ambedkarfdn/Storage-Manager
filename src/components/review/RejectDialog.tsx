"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { reviewMessages } from "@/lib/i18n/messages/review";

/** Asks for an optional reason before rejecting; the reason is shown to the person who uploaded. */
export function RejectDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (note: string) => Promise<void> }) {
  const t = useT(reviewMessages);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={count > 0} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectTitle", { n: count })}</DialogTitle>
          <DialogDescription>{t("rejectBody")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reject-note">{t("reasonLabel")}</Label>
          <Textarea id="reject-note" value={note} maxLength={500} rows={3} placeholder={t("reasonPlaceholder")} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            className="min-h-11"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(note.trim());
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
