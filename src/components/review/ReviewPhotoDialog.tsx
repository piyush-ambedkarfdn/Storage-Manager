"use client";

import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/provider";
import { reviewMessages } from "@/lib/i18n/messages/review";
import type { ReviewPhoto } from "@/types/review";

/** The full-size photo with its details, and the decision buttons. */
export function ReviewPhotoDialog({ photo, onClose, onApprove, onReject }: { photo: ReviewPhoto | null; onClose: () => void; onApprove: (p: ReviewPhoto) => void; onReject: (p: ReviewPhoto) => void }) {
  const t = useT(reviewMessages);
  return (
    <Dialog open={photo !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        {photo ? (
          <>
            <DialogHeader>
              <DialogTitle>{[photo.village_name, photo.activity].filter(Boolean).join(" · ") || t("title")}</DialogTitle>
              <DialogDescription>
                {t("uploadedBy")}: {photo.staff_name ?? "—"}
                {photo.event_date ? ` · ${format(new Date(photo.event_date + "T00:00:00"), "d MMM yyyy")}` : ""}
                {photo.program_name ? ` · ${photo.program_name}` : ""}
              </DialogDescription>
            </DialogHeader>
            {/* the full-size photo: only admins may open it */}
            {/* eslint-disable-next-line @next/next/no-img-element -- full-size review photo from our storage */}
            <img src={`/api/media/${photo.id}?v=original`} alt={photo.note ?? ""} className="max-h-[60dvh] w-full rounded-md bg-photo-surface object-contain" />
            <div className="flex flex-wrap gap-2 text-xs">
              {photo.consent !== "yes" ? <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{photo.consent === "no" ? t("consentNo") : t("consentUnknown")}</span> : null}
              {photo.has_children ? <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{t("children")}</span> : null}
            </div>
            {photo.note ? <p className="text-sm text-muted-foreground">{photo.note}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11 flex-1" onClick={() => onApprove(photo)}>
                <Check aria-hidden /> {t("approve")}
              </Button>
              <Button variant="destructive" className="min-h-11 flex-1" onClick={() => onReject(photo)}>
                <X aria-hidden /> {t("reject")}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
