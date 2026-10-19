export const DAY_SCOPES = ["national", "international", "local"] as const;
export type DayScope = (typeof DAY_SCOPES)[number];

/** A built-in day (src/config/awareness-days.ts). */
export type AwarenessDay = {
  id: string;
  month: number;
  day: number;
  name: string;
  nameHi: string;
  scope: DayScope;
  tags: string[];
};

/** A row of custom_days (added by an admin). year = only that year (moving dates). */
export type CustomDay = {
  id: string;
  name: string;
  name_hi: string | null;
  month: number;
  day: number;
  year: number | null;
  scope: DayScope;
  tags: string[];
  note: string | null;
};

/** One dated occurrence in a range, ready to show. key: "builtin:<id>" or "custom:<uuid>". */
export type UpcomingDay = {
  key: string;
  date: string; // YYYY-MM-DD
  name: string;
  nameHi: string | null;
  scope: DayScope;
  tags: string[];
  source: "builtin" | "custom";
  hidden: boolean;
  custom: CustomDay | null;
};
