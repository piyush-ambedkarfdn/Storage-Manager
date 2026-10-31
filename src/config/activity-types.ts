/**
 * Activity types are managed by admins in Settings > Lists (table activity_types, migration 0010).
 * - photos.activity_type stores the id (a short code like "training"), never the label, so renaming is always safe.
 * - A type in use cannot be deleted; hiding it ("retired") removes it from pickers but keeps it on old photos.
 * - The list below is only the starting set and the fallback before the database answers.
 *
 * The current list is kept in this module: the root layout loads it from the database and
 * <ActivityTypesProvider> sets it in the browser; server code calls loadActivityTypes() first.
 * activityLabel() and activityColor() can then be used anywhere without waiting.
 */
export type ActivityType = {
  id: string;
  label: string;
  labelHi: string;
  color: string;
  retired?: boolean;
  /** the program this type belongs to; null/undefined = a general type, used by programs that have no types of their own */
  programId?: string | null;
};

export const DEFAULT_ACTIVITY_TYPES: readonly ActivityType[] = [
  { id: "training", label: "Training", labelHi: "प्रशिक्षण", color: "#3B7DD8" },
  { id: "meeting", label: "Meeting", labelHi: "बैठक", color: "#8B63D9" },
  { id: "distribution", label: "Distribution", labelHi: "वितरण", color: "#D99A1E" },
  { id: "rally", label: "Rally", labelHi: "रैली", color: "#D2543C" },
  { id: "home-visit", label: "Home visit", labelHi: "गृह भ्रमण", color: "#2E9E6B" },
];

let current: readonly ActivityType[] = DEFAULT_ACTIVITY_TYPES;
let byId = new Map(current.map((a) => [a.id, a]));

/** Replaces the current list (ignored when empty, so a failed load keeps the last good list). */
export function setActivityTypes(list: readonly ActivityType[]) {
  if (!list.length) return;
  current = list;
  byId = new Map(list.map((a) => [a.id, a]));
}

/** Every type, including hidden (retired) ones, in the admin's order. */
export function getActivityTypes(): readonly ActivityType[] {
  return current;
}

/** Types offered in pickers (hidden ones still render on old photos). */
export function getActiveActivityTypes(): readonly ActivityType[] {
  return current.filter((a) => !a.retired);
}

const UNKNOWN_COLOR = "#7A8AA3";

export function activityLabel(id: string | null | undefined, locale: "en" | "hi" = "en"): string {
  if (!id) return locale === "hi" ? "अज्ञात" : "Unknown";
  const a = byId.get(id);
  if (!a) return id;
  return locale === "hi" ? a.labelHi || a.label : a.label;
}

export function activityColor(id: string | null | undefined): string {
  return (id && byId.get(id)?.color) || UNKNOWN_COLOR;
}

/** Database row → ActivityType. */
export function fromRow(r: { id: string; label: string; label_hi: string | null; color: string; hidden: boolean; program_id?: string | null }): ActivityType {
  return { id: r.id, label: r.label, labelHi: r.label_hi || r.label, color: r.color, retired: r.hidden, programId: r.program_id ?? null };
}

/**
 * The types to offer for a program (upload step 1, filters): the program's own types when it has any (not retired),
 * otherwise the general ones. With no program chosen yet: the general ones.
 */
export function activityTypesForProgram(list: readonly ActivityType[], programId: string | null | undefined): ActivityType[] {
  const active = list.filter((a) => !a.retired);
  if (programId) {
    const own = active.filter((a) => a.programId === programId);
    if (own.length) return own;
  }
  return active.filter((a) => !a.programId);
}
