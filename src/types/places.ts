export const PLACE_LEVELS = ["district", "block", "panchayat", "village"] as const;
export type PlaceLevel = (typeof PLACE_LEVELS)[number];

/** Levels staff can suggest and admins can merge (districts come only from the admin or LGD). */
export const CHILD_LEVELS = ["block", "panchayat", "village"] as const;
export type ChildLevel = (typeof CHILD_LEVELS)[number];

export type MergeType = "program" | ChildLevel;

export const PARENT_LEVEL: Record<ChildLevel, PlaceLevel> = {
  block: "district",
  panchayat: "block",
  village: "panchayat",
};

export type Place = {
  id: string;
  level: PlaceLevel;
  name: string;
  lgd_code: number | null;
  source: "lgd" | "user";
  approved: boolean;
  parent_id: string | null;
  /** "Chatra / Itkhori / Bhuchungdih" (parents only) */
  path: string;
  suggested_by_name: string | null;
};

export type PlaceList = { items: Place[]; total: number };

export type SimilarName = { id: string; name: string; score: number; sameParent: boolean };

/**
 * Thresholds for find_similar_names() scores.
 * 1 = same spelling after norm_name() or a saved alias: auto-select, no warning.
 * >= warn: show "Did you mean …?". Lower: a genuinely new name.
 */
export const SIMILARITY = { exact: 1, warn: 0.5 } as const;
