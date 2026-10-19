"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorChip } from "@/components/shared/ColorChip";
import { ManageOptionsDialog } from "@/components/settings/ManageOptionsDialog";
import { useOptions } from "@/hooks/useOptions";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { COLORED_TYPES, type OptionType } from "@/types/options";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

const NONE = "__none__";

/**
 * A dropdown over one admin-managed list (stores the label). Coloured lists show their chip.
 * Admins get "Edit list" beside it; a hidden value already on a post still shows.
 */
export function OptionSelect({
  type,
  value,
  onChange,
  label,
  id,
  allowNone = true,
  compact = false,
  showEdit = true,
}: {
  type: OptionType;
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
  id?: string;
  allowNone?: boolean;
  compact?: boolean;
  showEdit?: boolean;
}) {
  const t = useT(calendarMessages);
  const profile = useProfile();
  const { options, allOptions } = useOptions(type);
  const [manage, setManage] = useState(false);
  const colored = COLORED_TYPES.includes(type);
  const color = (v: string) => allOptions.find((o) => o.value === v)?.color ?? "#7A8AA3";
  const list = value && !options.some((o) => o.value === value) ? [...options, { id: value, value, color: color(value) }] : options;

  return (
    <div className={cn("flex items-center gap-1", !compact && "w-full")}>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger id={id} aria-label={label} className={cn(compact ? "h-8 min-w-32 border-transparent bg-transparent px-2 hover:border-input" : "min-h-10 w-full")}>
          <SelectValue placeholder={t("choose")}>
            {value ? colored ? <ColorChip color={color(value)} label={value} /> : value : t("choose")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value={NONE}>{t("none")}</SelectItem> : null}
          {list.map((o) => (
            <SelectItem key={o.id} value={o.value}>
              {colored ? <ColorChip color={o.color ?? "#7A8AA3"} label={o.value} /> : o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showEdit && profile.role === "admin" && !compact ? (
        <Button type="button" variant="link" className="h-auto shrink-0 px-1 text-xs" onClick={() => setManage(true)}>
          {t("editList")}
        </Button>
      ) : null}
      {manage ? <ManageOptionsDialog type={type} open onOpenChange={setManage} /> : null}
    </div>
  );
}
