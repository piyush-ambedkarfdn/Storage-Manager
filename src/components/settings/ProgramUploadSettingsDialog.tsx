"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ActivityTypesCard } from "@/components/settings/ActivityTypesCard";
import { requestJson } from "@/hooks/useOptions";
import { useProgramFormConfig } from "@/hooks/useProgramFormConfig";
import { normalizeConfig, type ProgramFormConfig, type ReportPartKey } from "@/lib/program-form/rules";
import { REPORT_PART_KEYS } from "@/types/report";
import { useT } from "@/lib/i18n/provider";
import { programSettingsMessages } from "@/lib/i18n/messages/programSettings";
import { uploadMessages, type UploadKey } from "@/lib/i18n/messages/upload";

/** Settings > Programs: this program's activity types, and which questions its upload form asks. */
export function ProgramUploadSettingsDialog({ program, onOpenChange }: { program: { id: string; name: string } | null; onOpenChange: (open: boolean) => void }) {
  const t = useT(programSettingsMessages);
  return (
    <Dialog open={program !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {program ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle", { program: program.name })}</DialogTitle>
              <DialogDescription>{t("dialogBody")}</DialogDescription>
            </DialogHeader>
            <ActivityTypesCard programId={program.id} programName={program.name} />
            <FormQuestions programId={program.id} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormQuestions({ programId }: { programId: string }) {
  const t = useT(programSettingsMessages);
  const tu = useT(uploadMessages);
  const qc = useQueryClient();
  const cfg = useProgramFormConfig(programId);
  const [busy, setBusy] = useState(false);

  async function save(next: ProgramFormConfig) {
    setBusy(true);
    try {
      await requestJson(`/api/program-form-config/${programId}`, { method: "PUT", body: next });
      await qc.invalidateQueries({ queryKey: ["program-form-config"] });
      toast.success(t("saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (k: ReportPartKey, on: boolean) =>
    save(normalizeConfig({ report_parts: on ? [...cfg.report_parts, k] : cfg.report_parts.filter((x) => x !== k), ask_themes: cfg.ask_themes }));

  return (
    <section className="flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">{t("formTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("formBody")}</p>
      <ul className="flex flex-col divide-y">
        {REPORT_PART_KEYS.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 py-2">
            <Label htmlFor={`q-${k}`} className="flex-1">
              {tu(`q_${k}` as UploadKey)}
              {k === "what_happened" ? <span className="ml-2 text-xs font-normal text-muted-foreground">{t("required")}</span> : null}
            </Label>
            <Switch id={`q-${k}`} checked={cfg.report_parts.includes(k)} disabled={busy || cfg.isLoading} onCheckedChange={(on) => void toggle(k, on)} />
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-2">
          <Label htmlFor="q-themes" className="flex-1">
            {t("askThemes")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{t("required")}</span>
          </Label>
          <Switch id="q-themes" checked={cfg.ask_themes} disabled={busy || cfg.isLoading} onCheckedChange={(on) => void save(normalizeConfig({ report_parts: cfg.report_parts, ask_themes: on }))} />
        </li>
      </ul>
      {cfg.report_parts.length === 0 && !cfg.ask_themes ? <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm">{t("noQuestions")}</p> : null}
    </section>
  );
}
