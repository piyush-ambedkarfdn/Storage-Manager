"use client";

import { ACTIVE_ACTIVITY_TYPES } from "@/config/activity-types";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";

/** Coloured activity chips from src/config/activity-types.ts (stores the id, never the label). */
export function ActivityTypePicker({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  const t = useT(uploadMessages);
  const locale = useLocale();
  return (
    <fieldset aria-invalid={!!error || undefined} aria-describedby={error ? "err-activity" : undefined}>
      <legend className="mb-1.5 text-sm font-semibold">{t("activity")}</legend>
      <div className="flex flex-wrap gap-2">
        {ACTIVE_ACTIVITY_TYPES.map((a) => {
          const on = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(a.id)}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-3 font-semibold", on ? "border-2" : "bg-card")}
              style={on ? { borderColor: a.color, backgroundColor: `color-mix(in srgb, ${a.color} 16%, transparent)` } : undefined}
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: a.color }} />
              {locale === "hi" ? a.labelHi : a.label}
              {locale === "hi" ? null : <span className="font-normal text-muted-foreground">{a.labelHi}</span>}
            </button>
          );
        })}
      </div>
      {error ? (
        <p id="err-activity" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
