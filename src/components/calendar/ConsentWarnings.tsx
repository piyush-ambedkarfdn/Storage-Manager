"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { ContentPhoto } from "@/types/content";

export function needsWarning(p: ContentPhoto) {
  return p.consent !== "yes" || p.has_children;
}

/** Photos without a clear consent, or with children: remove them, or confirm they were checked. */
export function ConsentWarnings({
  photos,
  confirmed,
  onConfirm,
  onRemove,
}: {
  photos: ContentPhoto[];
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT(calendarMessages);
  const flagged = photos.filter(needsWarning);
  if (!flagged.length) return null;
  return (
    <section role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <h3 className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" aria-hidden /> {t("warnTitle")}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {flagged.map((p) => {
          const name = p.village_name ?? p.id.slice(0, 8);
          return (
            <li key={p.id} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- cached thumbnail */}
              <img src={p.thumbUrl} alt="" className="size-10 rounded object-cover" />
              <span className="flex-1">
                {p.consent === "no" ? t("warnNoConsent", { name }) : p.consent === "unknown" ? t("warnUnsure", { name }) : null}
                {p.has_children ? ` ${t("warnChildren", { name })}` : null}
              </span>
              <Button type="button" size="sm" variant="outline" className="min-h-8" onClick={() => onRemove(p.id)}>
                {t("remove")}
              </Button>
            </li>
          );
        })}
      </ul>
      <label className="flex items-start gap-2">
        <Checkbox checked={confirmed} onCheckedChange={(c) => onConfirm(!!c)} className="mt-0.5" />
        {t("warnConfirm")}
      </label>
    </section>
  );
}
