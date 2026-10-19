"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

/** Phase 8: AI reads recent field reports and adds a few posts as Ideas for the month. */
export function IdeasDialog({ month, open, onOpenChange, onDone }: { month: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const t = useT(calendarMessages);
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ideasTitle")}</DialogTitle>
          <DialogDescription>{t("ideasBody")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ideas-n">{t("ideasCount")}</Label>
          <Input id="ideas-n" type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))} className="min-h-10 w-24" />
          <p className="text-xs text-muted-foreground">{t("aiFree")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button
            className="min-h-11"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { created } = await requestJson<{ created: number }>("/api/ai/ideas", { method: "POST", body: { month, count } });
                toast.success(t("ideasDone", { n: created, month }));
                onDone();
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("aiWorking") : t("ideasRun")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
