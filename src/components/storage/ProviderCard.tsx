"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { requestJson } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { storageMessages } from "@/lib/i18n/messages/storage";
import { PROVIDER_NAMES, type ProviderName, type ProviderStatus } from "@/types/storage";

export const PROVIDER_STATUS_KEY = ["storage-provider"] as const;

export function useProviderStatus() {
  return useQuery({ queryKey: PROVIDER_STATUS_KEY, queryFn: () => requestJson<ProviderStatus>("/api/storage/provider") });
}

/** Admin-only switch: where NEW uploads go. Each photo keeps its own storage, so switching moves nothing. */
export function ProviderCard() {
  const t = useT(storageMessages);
  const qc = useQueryClient();
  const { data } = useProviderStatus();
  const [busy, setBusy] = useState<ProviderName | null>(null);

  async function choose(name: ProviderName) {
    setBusy(name);
    try {
      await requestJson("/api/storage/provider", { method: "PUT", body: { active: name } });
      toast.success(t("switched", { name: t(name) }));
      await Promise.all([qc.invalidateQueries({ queryKey: PROVIDER_STATUS_KEY }), qc.invalidateQueries({ queryKey: ["storage-usage"] })]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-3 md:grid-cols-2">
      {PROVIDER_NAMES.map((name) => {
        const active = data?.active === name;
        const configured = name === "r2" ? data?.r2.configured : data?.gdrive.configured;
        return (
          <div key={name} className={cn("flex flex-col gap-2 rounded-lg border bg-card p-4", active && "border-2 border-primary")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t(name)}</h2>
              {active ? <ColorChip color="var(--success)" label={t("activeBadge")} /> : !configured ? <ColorChip color="var(--muted-foreground)" label={t("notSetUp")} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{name === "r2" ? t("r2Desc") : t("gdriveDesc")}</p>
            {name === "r2" && data && !configured ? <p className="text-sm">{t("r2NotSetUp")}</p> : null}
            {!active ? (
              <Button variant="outline" className="min-h-10 self-start" disabled={!configured || busy !== null} onClick={() => choose(name)}>
                {busy === name ? t("switching") : t("useForNew")}
              </Button>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
