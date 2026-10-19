"use client";

import { ACTIVITY_TYPES, type ActivityType } from "@/config/activity-types";
import { ColorChip } from "@/components/shared/ColorChip";
import { useLocale, useT } from "@/lib/i18n/provider";
import { settingsMessages } from "@/lib/i18n/messages/settings";

/** Read-only: activity types live in src/config/activity-types.ts and are never edited in the app. */
export function ActivityTypesCard() {
  const t = useT(settingsMessages);
  const locale = useLocale();
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("activityTitle")}</h2>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{t("inCode")}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("activityBody")} <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">src/config/activity-types.ts</code>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {(ACTIVITY_TYPES as readonly ActivityType[]).map((a) => (
          <li key={a.id}>
            <ColorChip
              size="md"
              color={a.color}
              label={`${locale === "hi" ? a.labelHi : a.label}${a.retired ? ` (${t("retired")})` : ""}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
