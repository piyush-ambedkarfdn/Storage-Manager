export type CategoryValue = {
  field: { label: string; sort_order: number } | null;
  option: { value: string; sort_order: number } | null;
};

/** The activity type of a photo: its program category called "...activity..." (CFW), else its first category. */
export function activityTypeOf(values: CategoryValue[] | null | undefined): string | null {
  const usable = (values ?? []).filter((v) => v.field && v.option);
  const chosen =
    usable.find((v) => /activity/i.test(v.field!.label)) ??
    [...usable].sort((a, b) => a.field!.sort_order - b.field!.sort_order || a.option!.sort_order - b.option!.sort_order)[0];
  return chosen?.option?.value ?? null;
}

export const NO_ACTIVITY_FOLDER = "No activity type";
export const NO_VILLAGE_FOLDER = "Village not set";
