"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages, type UploadKey } from "@/lib/i18n/messages/upload";
import { REPORT_PART_KEYS, type ReportParts } from "@/types/report";

/** The field report as four short boxes (only "What happened?" is required). Voice typing works in each. */
export function ReportField({ value, onChange, error }: { value: ReportParts; onChange: (v: ReportParts) => void; error?: string }) {
  const t = useT(uploadMessages);
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-secondary/40 p-3">
      <div>
        <h2 className="text-base font-bold">{t("reportTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("reportHint")}</p>
      </div>
      {REPORT_PART_KEYS.map((k, i) => (
        <div key={k} className="flex flex-col gap-1.5">
          <Label htmlFor={`report-${k}`}>{t(`q_${k}` as UploadKey)}</Label>
          <Textarea
            id={`report-${k}`}
            value={value[k]}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            placeholder={t(`p_${k}` as UploadKey)}
            rows={i === 0 ? 3 : 2}
            maxLength={2000}
            aria-invalid={(i === 0 && !!error) || undefined}
            aria-describedby={i === 0 && error ? "err-report" : undefined}
            className="bg-background"
          />
          {i === 0 && error ? (
            <p id="err-report" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
