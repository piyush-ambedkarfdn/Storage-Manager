"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import { CONSENT_VALUES, type Consent } from "@/types/photo";

export function ConsentField({ value, onChange }: { value: Consent; onChange: (v: Consent) => void }) {
  const t = useT(uploadMessages);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{t("consent")}</legend>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {CONSENT_VALUES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            onClick={() => onChange(c)}
            className={cn("min-h-11 rounded-md border font-semibold", value === c ? "border-2 border-primary bg-primary/10" : "bg-card")}
          >
            {t(`consent_${c}`)}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("consentHint")}</p>
    </fieldset>
  );
}
