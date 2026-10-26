"use client";

import { AlertCircle, Loader2, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/rating/StarRating";
import { missingRequired, ProgramFieldsPicker } from "@/components/categories/ProgramFieldsPicker";
import { BlobThumb, type DraftPhoto } from "@/components/upload/Dropzone";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import { uploadPhotosMessages } from "@/lib/i18n/messages/uploadPhotos";
import { ratingMessages } from "@/lib/i18n/messages/rating";
import { uploadSafeMessages } from "@/lib/i18n/messages/uploadSafe";
import type { PhotoOverride } from "@/lib/upload/queue-db";
import type { FieldValues, ProgramField } from "@/types/program-fields";

/** Keys of photos that still lack a required category (used to block the upload and highlight rows). */
export function photosMissingCategories(photos: DraftPhoto[], fields: ProgramField[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of photos) {
    const missing = missingRequired(fields, p.override.field_values ?? {});
    if (missing.length) out.set(p.key, missing.map((f) => f.id));
  }
  return out;
}

/**
 * Step 2: every photo is a card with its own star rating and its own program categories.
 * The field report (step 1) is shared; categories and rating differ per photo.
 */
export function PhotoList({
  photos,
  programFields,
  missing,
  onChange,
  onRemove,
  onEdit,
}: {
  photos: DraftPhoto[];
  programFields: ProgramField[];
  /** photo key → category ids still missing (red) */
  missing: Map<string, string[]>;
  onChange: (key: string, patch: Partial<PhotoOverride>) => void;
  onRemove: (key: string) => void;
  onEdit: (key: string) => void;
}) {
  const t = useT(uploadMessages);
  const tp = useT(uploadPhotosMessages);
  const tr = useT(ratingMessages);
  const ts = useT(uploadSafeMessages);

  if (photos.length === 0) return <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>;

  function applyToAll(values: FieldValues) {
    const copy = Object.fromEntries(Object.entries(values).filter(([, v]) => v.length));
    for (const p of photos) onChange(p.key, { field_values: { ...copy } });
    toast.success(tp("appliedToAll", { n: photos.length }));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">{t("photosAdded", { n: photos.length })}</p>
      <p className="text-xs text-muted-foreground">{tp("sameReport")}</p>
      <ul className="flex flex-col gap-3">
        {photos.map((p, i) => {
          const values = p.override.field_values ?? {};
          const hasValues = Object.values(values).some((v) => v.length);
          return (
            <li key={p.key} id={`photo-${p.key}`} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <div className="flex gap-3">
                <div className="w-20 shrink-0">
                  {p.thumb ? (
                    <BlobThumb blob={p.thumb} alt={p.name} />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center rounded-md bg-photo-surface text-muted-foreground" role={p.status === "error" ? "alert" : "status"}>
                      {p.status === "error" ? <AlertCircle className="size-6 text-destructive" aria-hidden /> : <Loader2 className="size-6 animate-spin" aria-hidden />}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{tp("photoN", { n: i + 1, total: photos.length })}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(p.key)}
                      aria-label={`${t("removePhoto")}: ${p.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full border bg-background"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  {p.status === "preparing" ? <span className="text-xs text-muted-foreground">{ts("preparingShort")}</span> : null}
                  {p.status === "error" ? <span className="text-xs text-destructive">{p.error ?? ts("photoError")}</span> : null}
                  <div className="-ml-2 flex items-center gap-2">
                    <StarRating value={p.override.rating} onChange={(rating) => onChange(p.key, { rating })} />
                  </div>
                  <span className="text-xs text-muted-foreground">{p.override.rating ? tr("starsOf", { n: p.override.rating }) : tr("notRated")}</span>
                </div>
              </div>

              {programFields.length ? (
                <section className="flex flex-col gap-2 rounded-md border p-3" aria-label={tp("categoriesFor")}>
                  <h3 className="text-sm font-semibold">{tp("categoriesFor")}</h3>
                  <ProgramFieldsPicker
                    fields={programFields}
                    value={values}
                    onChange={(next) => onChange(p.key, { field_values: next })}
                    errorFieldIds={missing.get(p.key) ?? []}
                  />
                  {photos.length > 1 && hasValues ? (
                    <Button type="button" variant="outline" size="sm" className="min-h-9 self-start" onClick={() => applyToAll(values)}>
                      {tp("applyToAll")}
                    </Button>
                  ) : null}
                </section>
              ) : null}

              <button
                type="button"
                onClick={() => onEdit(p.key)}
                className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border text-sm"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                {p.override.has_children ? t("hasChildren") : p.override.village_name || p.override.note ? "✓ " + t("photoOptions") : t("photoOptions")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
