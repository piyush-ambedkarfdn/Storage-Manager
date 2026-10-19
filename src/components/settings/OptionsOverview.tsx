"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/shared/ColorChip";
import { ManageOptionsDialog } from "@/components/settings/ManageOptionsDialog";
import { useOptions } from "@/hooks/useOptions";
import { COLORED_TYPES, OPTION_TYPES, type OptionType } from "@/types/options";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";

function ListRow({ type, onManage }: { type: OptionType; onManage: () => void }) {
  const t = useT(settingsMessages);
  const { options, allOptions } = useOptions(type);
  const hidden = allOptions.length - options.length;
  const colored = COLORED_TYPES.includes(type);
  return (
    <tr className="border-t align-top">
      <th scope="row" className="px-4 py-3 text-left font-semibold whitespace-nowrap">
        {t(`list_${type}` as SettingsKey)}
      </th>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) =>
            colored ? (
              <ColorChip key={o.id} color={o.color ?? "#7A8AA3"} label={o.value} />
            ) : (
              <span key={o.id} className="rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                {o.value}
              </span>
            ),
          )}
          {hidden > 0 ? <span className="px-1 text-xs text-muted-foreground">{t("hiddenCount", { n: hidden })}</span> : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button variant="outline" className="min-h-9" onClick={onManage}>
          {t("manage")}
        </Button>
      </td>
    </tr>
  );
}

/** Every admin-managed list with its current values and a Manage button. */
export function OptionsOverview() {
  const t = useT(settingsMessages);
  const [open, setOpen] = useState<OptionType | null>(null);
  const [last, setLast] = useState<OptionType>("status");
  return (
    <section className="rounded-lg border bg-card">
      <div className="p-4 pb-2">
        <h2 className="text-base font-semibold">{t("listsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("listsBody")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {OPTION_TYPES.map((type) => (
              <ListRow
                key={type}
                type={type}
                onManage={() => {
                  setLast(type);
                  setOpen(type);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ManageOptionsDialog type={open ?? last} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </section>
  );
}
