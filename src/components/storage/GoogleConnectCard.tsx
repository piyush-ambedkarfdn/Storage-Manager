"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PROVIDER_STATUS_KEY, useProviderStatus } from "@/components/storage/ProviderCard";
import { requestJson } from "@/hooks/useOptions";
import { APP } from "@/config/app";
import { useT } from "@/lib/i18n/provider";
import { storageMessages } from "@/lib/i18n/messages/storage";

/** Connect the organisation's Google account (OAuth). Tokens stay on the server, encrypted. */
export function GoogleConnectCard() {
  const t = useT(storageMessages);
  const qc = useQueryClient();
  const { data } = useProviderStatus();
  const [confirm, setConfirm] = useState(false);
  const g = data?.gdrive;

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{t("googleTitle")}</h2>
      {!g ? null : !g.appConfigured ? (
        <p className="text-sm text-muted-foreground">{t("googleNotConfigured")}</p>
      ) : g.connection ? (
        <>
          <p className="text-sm">{t("googleConnected", { email: g.connection.account_email ?? "?" })}</p>
          <p className="text-sm text-muted-foreground">{t("googleFolder", { name: APP.name })}</p>
          <div className="flex flex-wrap gap-2">
            {/* a plain link: the browser must follow the redirect to Google */}
            <a href="/api/storage/google/connect" className={buttonVariants({ variant: "outline", className: "min-h-10" })}>
              {t("reconnect")}
            </a>
            <Button variant="ghost" className="min-h-10 text-destructive" onClick={() => setConfirm(true)}>
              {t("disconnect")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("googleNotConnected")}</p>
          <a href="/api/storage/google/connect" className={buttonVariants({ className: "min-h-11 self-start" })}>
            {t("connect")}
          </a>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("disconnectTitle")}
        body={t("disconnectBody")}
        confirmLabel={t("disconnect")}
        destructive
        onConfirm={async () => {
          try {
            await requestJson("/api/storage/google/disconnect", { method: "POST" });
            toast.success(t("disconnected"));
            await qc.invalidateQueries({ queryKey: PROVIDER_STATUS_KEY });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </section>
  );
}
