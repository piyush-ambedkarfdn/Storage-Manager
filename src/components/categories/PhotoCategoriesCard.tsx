"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { ProgramFieldsPicker } from "@/components/categories/ProgramFieldsPicker";
import { requestJson } from "@/hooks/useOptions";
import { useProgramFields } from "@/hooks/useProgramFields";
import { useLocale, useT } from "@/lib/i18n/provider";
import { categoriesMessages } from "@/lib/i18n/messages/categories";
import type { FieldValues } from "@/types/program-fields";

/** The photo's program categories, with Edit (admin). */
export function PhotoCategoriesCard({ photoId, programId, optionIds, onChanged }: { photoId: string; programId: string | null; optionIds: string[]; onChanged: () => void }) {
  const t = useT(categoriesMessages);
  const locale = useLocale();
  const { fields } = useProgramFields(programId, true);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<FieldValues>({});
  const [busy, setBusy] = useState(false);
  if (!programId || !fields.length) return null;

  const current: FieldValues = Object.fromEntries(fields.map((f) => [f.id, f.options.filter((o) => optionIds.includes(o.id)).map((o) => o.id)]));

  async function save() {
    setBusy(true);
    try {
      await requestJson(`/api/photos/${photoId}/categories`, { method: "PUT", body: { values } });
      toast.success(t("saved"));
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => {
              setValues(current);
              setEditing(true);
            }}
          >
            {t("editCategories")}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <>
          <ProgramFieldsPicker fields={fields.filter((f) => !f.hidden)} value={values} onChange={setValues} />
          <div className="flex gap-2">
            <Button className="min-h-10" onClick={save} disabled={busy}>
              {t("save")}
            </Button>
            <Button variant="outline" className="min-h-10" onClick={() => setEditing(false)} disabled={busy}>
              {t("cancel")}
            </Button>
          </div>
        </>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {fields.map((f) => {
            const chosen = f.options.filter((o) => optionIds.includes(o.id));
            return (
              <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                <dt className="text-muted-foreground">{locale === "hi" && f.label_hi ? f.label_hi : f.label}:</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {chosen.length
                    ? chosen.map((o) => <ColorChip key={o.id} color={o.color ?? "#7A8AA3"} label={locale === "hi" && o.value_hi ? o.value_hi : o.value} />)
                    : <span className="text-muted-foreground">{t("noneSet")}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
