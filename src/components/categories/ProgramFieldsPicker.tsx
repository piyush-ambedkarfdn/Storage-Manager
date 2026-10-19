"use client";

import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { categoriesMessages } from "@/lib/i18n/messages/categories";
import type { FieldValues, ProgramField } from "@/types/program-fields";

const DEFAULT_COLOR = "#7A8AA3";

/** Required categories that have no value yet (for form checks). */
export function missingRequired(fields: ProgramField[], values: FieldValues): ProgramField[] {
  return fields.filter((f) => f.required && !(values[f.id]?.length));
}

/**
 * Chips for a program's categories. One-choice categories behave like radio buttons (tap again to clear),
 * several-choice ones like checkboxes. Large targets for phones.
 */
export function ProgramFieldsPicker({
  fields,
  value,
  onChange,
  errorFieldIds = [],
  inheritLabel,
}: {
  fields: ProgramField[];
  value: FieldValues;
  onChange: (v: FieldValues) => void;
  errorFieldIds?: string[];
  /** per-photo mode: show which batch value applies when nothing is chosen here */
  inheritLabel?: (field: ProgramField) => string | null;
}) {
  const t = useT(categoriesMessages);
  const locale = useLocale();
  if (!fields.length) return null;

  function toggle(f: ProgramField, optionId: string) {
    const cur = value[f.id] ?? [];
    const on = cur.includes(optionId);
    const next = f.multiple ? (on ? cur.filter((x) => x !== optionId) : [...cur, optionId]) : on ? [] : [optionId];
    onChange({ ...value, [f.id]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => {
        const label = locale === "hi" && f.label_hi ? f.label_hi : f.label;
        const err = errorFieldIds.includes(f.id);
        const inherited = inheritLabel?.(f);
        return (
          <fieldset key={f.id} aria-invalid={err || undefined} aria-describedby={err ? `err-field-${f.id}` : undefined}>
            <legend className="mb-1.5 text-sm font-semibold">
              {label}{" "}
              <span className="font-normal text-muted-foreground">
                · {f.multiple ? t("pickSeveral") : t("pickOne")}
                {f.required ? ` · ${t("requiredMark")}` : ""}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2" role={f.multiple ? "group" : "radiogroup"}>
              {f.options.map((o) => {
                const on = (value[f.id] ?? []).includes(o.id);
                const color = o.color ?? DEFAULT_COLOR;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={f.multiple ? "checkbox" : "radio"}
                    aria-checked={on}
                    onClick={() => toggle(f, o.id)}
                    className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-3 font-semibold", on ? "border-2" : "bg-card")}
                    style={on ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` } : undefined}
                  >
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {locale === "hi" && o.value_hi ? o.value_hi : o.value}
                  </button>
                );
              })}
            </div>
            {inherited && !(value[f.id]?.length) ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("sameAsBatch")}: {inherited}
              </p>
            ) : null}
            {err ? (
              <p id={`err-field-${f.id}`} className="mt-1 text-xs text-destructive">
                {t("mustChoose", { name: label })}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
