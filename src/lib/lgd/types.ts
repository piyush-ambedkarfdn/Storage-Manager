/** One village line from an LGD file, reduced to what the app stores. Codes are digit strings ("" if missing). */
export type LgdRow = {
  dc: string; // district code
  dn: string; // district name (English)
  bc: string; // block code
  bn: string; // block name
  pc: string; // gram panchayat (local body) code
  pn: string; // gram panchayat name
  vc: string; // village code
  vn: string; // village name
};

export type LgdField = keyof LgdRow;

export const LGD_FIELD_LABELS: Record<LgdField, string> = {
  dc: "District Code",
  dn: "District Name (In English)",
  bc: "Block Code",
  bn: "Block Name (In English)",
  pc: "Local Body (Gram Panchayat) Code",
  pn: "Local Body (Gram Panchayat) Name (In English)",
  vc: "Village Code",
  vn: "Village Name (In English)",
};

export type LgdDistrictSummary = { code: string; name: string; villages: number };

export type LgdParseResult = {
  rows: LgdRow[];
  /** field -> the column title it was read from */
  columns: Record<LgdField, string>;
  districts: LgdDistrictSummary[];
};

/** Counts for one level returned by the lgd_import() database function. */
export type LgdLevelCounts = {
  total: number;
  new: number;
  adopted: number;
  already: number;
  renamed: number;
  moved: number;
  orphans: number;
};

export type LgdResult = {
  districts: LgdLevelCounts;
  blocks: LgdLevelCounts;
  panchayats: LgdLevelCounts;
  villages: LgdLevelCounts;
  skipped_rows: number;
  multi_panchayat_villages: number;
  committed: boolean;
};
