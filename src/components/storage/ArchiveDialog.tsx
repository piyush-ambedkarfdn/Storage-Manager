"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import { commonMessages } from "@/lib/i18n/messages/common";
import type { ApplyResult, CleanupFilters } from "@/types/cleanup";

/**
 * Confirms, then archives in small batches (originals deleted from storage first, thumbnails kept),
 * showing progress. Stopping keeps everything already done.
 */
export function ArchiveDialog({
  open,
  onOpenChange,
  filters,
  count,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: CleanupFilters;
  count: number;
  onDone: (archived: number, failed: ApplyResult["failed"]) => void;
}) {
  const t = useT(cleanupMessages);
  const tc = useT(commonMessages);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const stop = useRef(false);

  async function run() {
    setRunning(true);
    stop.current = false;
    let total = 0;
    const failed: ApplyResult["failed"] = [];
    try {
      for (let round = 0; round < 1000 && !stop.current; round++) {
        const r = await requestJson<ApplyResult>("/api/storage/cleanup/apply", { method: "POST", body: { filters, action: "archive", batch: 25 } });
        total += r.done;
        failed.push(...r.failed);
        setDone(total);
        if (r.remaining === 0 || (r.done === 0 && r.failed.length > 0)) break;
      }
    } finally {
      setRunning(false);
      onDone(total, failed);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("archiveTitle", { n: count })}</DialogTitle>
          <DialogDescription>{t("archiveBody")}</DialogDescription>
        </DialogHeader>
        {running ? (
          <p role="status" aria-live="polite">
            {t("archiving", { done, total: count })}
          </p>
        ) : null}
        <DialogFooter>
          {running ? (
            <Button variant="outline" className="min-h-11" onClick={() => (stop.current = true)}>
              {t("moveStop")}
            </Button>
          ) : (
            <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
          )}
          <Button variant="destructive" className="min-h-11" onClick={run} disabled={running}>
            {t("archiveConfirm", { n: count })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
