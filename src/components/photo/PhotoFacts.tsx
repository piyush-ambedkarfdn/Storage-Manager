"use client";

import { format } from "date-fns";
import { ActivityChip } from "@/components/shared/ActivityChip";
import { ColorChip } from "@/components/shared/ColorChip";
import { StarRating } from "@/components/rating/StarRating";
import { useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { photoMessages } from "@/lib/i18n/messages/photo";
import { ratingMessages } from "@/lib/i18n/messages/rating";
import type { PhotoDetail } from "@/types/photo-detail";

const fmtDate = (d: string | null) => (d ? format(new Date(d), "d MMM yyyy") : null);

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mb-2 font-semibold">{children}</dd>
    </div>
  );
}

/** Everything the staff member entered for this photo, exactly as entered, with who and when. */
export function PhotoFacts({ detail }: { detail: PhotoDetail }) {
  const t = useT(photoMessages);
  const tr = useT(ratingMessages);
  const { allOptions: themes } = useOptions("theme");
  const p = detail.photo;
  const r = detail.report;
  const notGiven = <span className="font-normal text-muted-foreground">{t("notGiven")}</span>;
  const camera = p.exif_taken_at ? p.exif_taken_at.slice(0, 10) : null;

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t("enteredByStaff")}</h2>
        <span className="text-xs text-muted-foreground">
          {t("uploadedBy", { name: p.uploader_name ?? "—", date: format(new Date(p.created_at), "d MMM yyyy, HH:mm") })}
        </span>
      </div>
      <dl className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <Row label={t("program")}>{p.program_name ?? notGiven}</Row>
        <Row label={t("place")} wide>
          {[p.district_name, p.block_name, p.panchayat_name, p.village_name].filter(Boolean).join(" / ") || notGiven}
        </Row>
        <Row label={t("activity")}>
          <ActivityChip id={p.activity_type} />
        </Row>
        <Row label={t("eventDate")}>
          {fmtDate(p.event_date) ?? notGiven}
          {camera && camera !== p.event_date ? (
            <span className="block text-xs font-normal text-muted-foreground">
              {t("cameraDate")}: {fmtDate(camera)}
            </span>
          ) : null}
        </Row>
        <Row label={t("takenBy")}>{p.taken_by ?? notGiven}</Row>
        <Row label={t("consent")}>
          <span className={p.consent === "yes" ? "text-success" : "text-destructive"}>{t(`consent_${p.consent}`)}</span>
        </Row>
        <Row label={tr("ratedBy")}>{p.rating ? <StarRating value={p.rating} /> : <span className="font-normal text-muted-foreground">{tr("notRated")}</span>}</Row>
        <Row label={t("children")}>{p.has_children ? t("yes") : t("no")}</Row>
        <Row label={t("people")}>{r?.beneficiary_count ?? notGiven}</Row>
        <Row label={t("note")} wide>
          <span className="font-normal">{p.note ?? notGiven}</span>
        </Row>
        <Row label={t("themes")} wide>
          <span className="flex flex-wrap gap-1.5">
            {(r?.theme_ids ?? []).map((id) => {
              const th = themes.find((o) => o.id === id);
              return th ? <ColorChip key={id} color={th.color ?? "#8F6200"} label={th.value} size="md" /> : null;
            })}
            {!r?.theme_ids?.length ? notGiven : null}
          </span>
        </Row>
      </dl>
      <p className="text-xs text-muted-foreground">
        {t("storage")}: {p.storage_provider === "r2" ? "Cloudflare R2" : "Google Drive"} · {Math.round(p.size_bytes / 1024)} KB
      </p>
    </section>
  );
}
