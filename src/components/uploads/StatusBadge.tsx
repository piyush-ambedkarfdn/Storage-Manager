"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { reviewMessages } from "@/lib/i18n/messages/review";
import { cn } from "@/lib/utils";

const STYLE = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  rejected: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
} as const;
const ICON = { pending: Clock, active: CheckCircle2, rejected: XCircle } as const;

/** "Waiting for review", "Approved" or "Rejected" on a staff member's photo. */
export function StatusBadge({ status, className }: { status: "pending" | "active" | "rejected"; className?: string }) {
  const t = useT(reviewMessages);
  const Icon = ICON[status];
  const label = status === "pending" ? t("statusPending") : status === "active" ? t("statusActive") : t("statusRejected");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold", STYLE[status], className)}>
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}
