"use client";

import { useState } from "react";
import { GitMerge, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ManageOptionsDialog } from "@/components/settings/ManageOptionsDialog";
import { MergeDialog, type MergeSource } from "@/components/settings/MergeDialog";
import { ProgramFieldsDialog } from "@/components/categories/ProgramFieldsDialog";
import { useAllProgramFields } from "@/hooks/useProgramFields";
import { categoriesMessages } from "@/lib/i18n/messages/categories";
import { useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages } from "@/lib/i18n/messages/settings";

/** Programs: list with their fixed codes, plus add/rename/hide/reorder (dialog) and merge duplicates. */
export function ProgramsManager() {
  const t = useT(settingsMessages);
  const { allOptions, isLoading } = useOptions("program");
  const [manage, setManage] = useState(false);
  const [merging, setMerging] = useState<MergeSource | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string } | null>(null);
  const tc = useT(categoriesMessages);
  const { fields } = useAllProgramFields(true);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t("programsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("programsBody")} {t("programHint")}</p>
        </div>
        <Button className="min-h-10" onClick={() => setManage(true)}>
          {t("managePrograms")}
        </Button>
      </div>
      {!isLoading && allOptions.length === 0 ? (
        <EmptyState title={t("noPrograms")} />
      ) : (
        <ul className="divide-y rounded-md border">
          {allOptions.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className={p.hidden ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>{p.value}</span>
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{p.slug}</code>
              {p.hidden ? <span className="text-xs text-muted-foreground">{t("hidden")}</span> : null}
              <span className="flex-1" />
              <Button variant="outline" className="min-h-9" onClick={() => setCategories({ id: p.id, name: p.value })}>
                <Tags aria-hidden /> {tc("title")}
                {fields.filter((f) => f.program_id === p.id).length ? ` (${fields.filter((f) => f.program_id === p.id).length})` : ""}
              </Button>
              <Button variant="ghost" className="min-h-9" onClick={() => setMerging({ id: p.id, name: p.value })}>
                <GitMerge aria-hidden /> {t("merge")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ManageOptionsDialog type="program" open={manage} onOpenChange={setManage} />
      <MergeDialog type="program" from={merging} onOpenChange={(o) => !o && setMerging(null)} />
      <ProgramFieldsDialog program={categories} onOpenChange={(o) => !o && setCategories(null)} />
    </section>
  );
}
