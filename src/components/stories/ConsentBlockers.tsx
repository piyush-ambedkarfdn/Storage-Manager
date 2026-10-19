"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { ContentPhoto } from "@/types/content";
import type { StoryBlocker } from "@/types/story";

/** Photos that stop "ready" (no consent) and photos to check (children), with Remove. */
export function ConsentBlockers({ blockers, photos, onRemove }: { blockers: StoryBlocker[]; photos: ContentPhoto[]; onRemove: (id: string) => void }) {
  const t = useT(storiesMessages);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const blocking = blockers.filter((b) => b.reason === "no_consent");
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t("checks")}</h3>
      {!blocking.length ? (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> {t("allClear")}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {blockers.map((b) => {
          const p = byId.get(b.photo_id);
          return (
            <li key={`${b.photo_id}${b.reason}`} className={b.reason === "no_consent" ? "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm" : "flex items-center gap-2 rounded-md border border-marigold bg-marigold/10 p-2 text-sm"}>
              {p ? (
                // eslint-disable-next-line @next/next/no-img-element -- cached thumbnail
                <img src={p.thumbUrl} alt="" className="size-10 rounded object-cover" />
              ) : null}
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{b.reason === "no_consent" ? t("noConsent") : t("children")}</span>
              {b.reason === "no_consent" ? (
                <Button size="sm" variant="outline" className="min-h-8" onClick={() => onRemove(b.photo_id)}>
                  {t("remove")}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
