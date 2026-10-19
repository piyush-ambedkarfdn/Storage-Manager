/** One village line from LGD, reduced to what the app stores. Codes are digit strings ("" if missing). */
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

/**
 * What an LGD file contains, recognised from its column titles.
 * combined      one sheet with district, block, panchayat and village (CSV/xlsx made by hand)
 * gpMap         "Village To Gram Panchayat Mapping" (district, sub-district, village, local body)
 * blockVillages "All Development Blocks of State With Covered Village" (district, block, village)
 * blockList     "All Development Blocks of State" (blocks only, no villages: not enough)
 */
export type LgdFileKind = "combined" | "gpMap" | "blockVillages" | "blockList" | "unknown";

export type LgdFileInfo = { name: string; kind: LgdFileKind; rows: number; columns: Partial<Record<LgdField, string>> };

export type LgdDistrictSummary = { code: string; name: string; villages: number };

export type LgdJoinNotes = {
  /** villages LGD lists without any gram panchayat: left out */
  noPanchayat: number;
  /** villages missing from the block file whose block was taken from their panchayat's other villages */
  blockFromPanchayat: number;
  /** villages with no block at all: left out */
  noBlock: number;
};

export type LgdParseResult = {
  rows: LgdRow[];
  files: LgdFileInfo[];
  districts: LgdDistrictSummary[];
  notes: LgdJoinNotes;
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
