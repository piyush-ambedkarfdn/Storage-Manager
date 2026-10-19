"use client";

import { AlertTriangle } from "lucide-react";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";

/** Tells everyone when the active storage is nearly full (85%) or uploads are paused (95%). */
export function StorageBanner() {
  const t = useT(uploadMessages);
  const { active } = useStorageUsage();
  if (!active || (active.level !== "amber" && active.level !== "block")) return null;
  const block = active.level === "block";
  return (
    <div
      role="status"
      className={
        block
          ? "flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm"
          : "flex items-start gap-2 rounded-md border border-marigold bg-marigold/15 px-3 py-2 text-sm"
      }
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{block ? t("storageBlock") : t("storageAmber")}</span>
    </div>
  );
}
