"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isEnabled } from "@/config/features";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import type { ReportParts } from "@/types/report";

export const MAX_THEMES = 3;

/** 1 to 3 problem themes (admin-managed list). "Suggest from report" appears once AI is on (phase 8). */
export function ThemePicker({
  value,
  onChange,
  report,
  error,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  report: ReportParts;
  error?: string;
}) {
  const t = useT(uploadMessages);
  const { options } = useOptions("theme");
  const [suggesting, setSuggesting] = useState(false);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < MAX_THEMES) onChange([...value, id]);
  }

  async function suggest() {
    setSuggesting(true);
    try {
      const { theme_ids } = await requestJson<{ theme_ids: string[] }>("/api/ai/suggest-themes", { method: "POST", body: { report_parts: report } });
      onChange([...new Set([...value, ...theme_ids])].slice(0, MAX_THEMES));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <fieldset aria-describedby={error ? "err-themes" : "themes-count"}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold">
          {t("themes")} <span className="font-normal text-muted-foreground">· {t("themesHint")}</span>
        </legend>
        {isEnabled("ai") ? (
          <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={suggest} disabled={suggesting || !report.what_happened.trim()}>
            <Sparkles aria-hidden /> {t("suggestThemes")}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.id)}
              disabled={!on && value.length >= MAX_THEMES}
              className={cn(
                "min-h-10 rounded-full border px-3 text-sm font-semibold disabled:opacity-50",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {o.value}
            </button>
          );
        })}
      </div>
      <p id="themes-count" className="mt-1 text-xs text-muted-foreground">
        {t("themesPicked", { n: value.length })}
      </p>
      {error ? (
        <p id="err-themes" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
