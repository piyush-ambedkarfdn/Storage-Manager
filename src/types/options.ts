/** Admin-managed lists in calendar_options. "theme" = problem themes on field reports. */
export const OPTION_TYPES = ["platform", "format", "pillar", "goal", "status", "stage", "theme"] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

/** Lists whose items carry a colour chip. */
export const COLORED_TYPES: readonly OptionType[] = ["status", "stage", "theme"];

/** A dropdown option or a program, in one shape so one dialog can manage both. */
export type OptionItem = {
  id: string;
  type: OptionType | "program";
  value: string;
  color: string | null;
  sort_order: number;
  hidden: boolean;
  /** status only: photos in posts with this status cannot be trashed */
  protects_photos: boolean;
  /** programs only: used in storage keys, never changes */
  slug?: string;
};

export type Program = { id: string; name: string; slug: string; hidden: boolean; sort_order: number };
