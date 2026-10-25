export type ProgramSummary = { program_id: string; program: string; photo_count: number };
export type ProgramFieldSummary = { id: string; label: string; label_hi: string | null };

/** A row of program_tree() (migration 0014). */
export type ProgramTreeRow = {
  staff_id: string | null;
  staff: string | null;
  district_id: string | null;
  district: string | null;
  panchayat_id: string | null;
  panchayat: string | null;
  village_id: string | null;
  village: string | null;
  option_id: string | null;
  option_name: string | null;
  option_name_hi: string | null;
  option_color: string | null;
  option_sort: number | null;
  photo_count: number;
};

export type ProgramViewData = {
  programs: ProgramSummary[];
  fields: ProgramFieldSummary[];
  fieldId: string | null;
  rows: ProgramTreeRow[];
};
