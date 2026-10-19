"use client";

import { activityColor, activityLabel } from "@/config/activity-types";
import { useLocale } from "@/lib/i18n/provider";
import { ColorChip } from "@/components/shared/ColorChip";

/** Chip for an activity type id from src/config/activity-types.ts. */
export function ActivityChip({ id, className }: { id: string | null | undefined; className?: string }) {
  const locale = useLocale();
  return <ColorChip color={activityColor(id)} label={activityLabel(id, locale)} className={className} />;
}
