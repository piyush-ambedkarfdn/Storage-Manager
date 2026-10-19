/**
 * Activity types live in code, not in the database. Edit this list to add or recolour a type.
 * - photos.activity_type stores the id, never the label, so renaming a label is always safe.
 * - Never delete an id that photos use: add `retired: true` instead (hidden from pickers, still shown on old photos).
 * - One mid-tone colour per type that reads well on light and dark backgrounds.
 */
export type ActivityType = {
  id: string;
  label: string;
  labelHi: string;
  color: string;
  retired?: boolean;
};

export const ACTIVITY_TYPES = [
  { id: "training", label: "Training", labelHi: "प्रशिक्षण", color: "#3B7DD8" },
  { id: "meeting", label: "Meeting", labelHi: "बैठक", color: "#8B63D9" },
  { id: "distribution", label: "Distribution", labelHi: "वितरण", color: "#D99A1E" },
  { id: "rally", label: "Rally", labelHi: "रैली", color: "#D2543C" },
  { id: "home-visit", label: "Home visit", labelHi: "गृह भ्रमण", color: "#2E9E6B" },
] as const satisfies readonly ActivityType[];

export type ActivityTypeId = (typeof ACTIVITY_TYPES)[number]["id"];

export const ACTIVITY_BY_ID: Record<string, ActivityType> = Object.fromEntries(
  ACTIVITY_TYPES.map((a) => [a.id, a]),
);

/** Types offered in pickers (retired ones are hidden but still render on old photos). */
export const ACTIVE_ACTIVITY_TYPES: readonly ActivityType[] = (ACTIVITY_TYPES as readonly ActivityType[]).filter(
  (a) => !a.retired,
);

const UNKNOWN_COLOR = "#7A8AA3";

export function activityLabel(id: string | null | undefined, locale: "en" | "hi" = "en"): string {
  if (!id) return locale === "hi" ? "अज्ञात" : "Unknown";
  const a = ACTIVITY_BY_ID[id];
  if (!a) return id;
  return locale === "hi" ? a.labelHi : a.label;
}

export function activityColor(id: string | null | undefined): string {
  return (id && ACTIVITY_BY_ID[id]?.color) || UNKNOWN_COLOR;
}
