"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import type { StorageSettings } from "@/types/cleanup";

/** R2 limit, warning / banner / block thresholds, trash days. */
export function StorageSettingsCard({ settings }: { settings: StorageSettings }) {
  const t = useT(cleanupMessages);
  const qc = useQueryClient();
  const [v, setV] = useState({
    limit_gb: Math.round((settings.limit_bytes / 1e9) * 10) / 10,
    warn_pct: settings.warn_pct,
    amber_pct: settings.amber_pct,
    block_pct: settings.block_pct,
    trash_days: settings.trash_days,
  });
  const [busy, setBusy] = useState(false);
  const field = (k: keyof typeof v, label: string, step = 1) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`ss-${k}`} className="text-xs">
        {label}
      </Label>
      <Input id={`ss-${k}`} type="number" step={step} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className="min-h-10" />
    </div>
  );
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{t("settingsTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {field("limit_gb", t("limitGb"), 0.1)}
        {field("warn_pct", t("warnPct"))}
        {field("amber_pct", t("amberPct"))}
        {field("block_pct", t("blockPct"))}
        {field("trash_days", t("trashDays"))}
      </div>
      <p className="text-xs text-muted-foreground">{t("limitHint")}</p>
      <Button
        className="min-h-10 self-start"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await requestJson("/api/storage/settings", { method: "PUT", body: v });
            toast.success(t("saved"));
            await Promise.all([qc.invalidateQueries({ queryKey: ["storage-settings"] }), qc.invalidateQueries({ queryKey: ["storage-usage"] })]);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("save")}
      </Button>
    </section>
  );
}
