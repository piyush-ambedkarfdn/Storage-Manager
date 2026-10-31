export type ProgramSummary = { program_id: string; program: string; photo_count: number };
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
  activity_id: string | null;
  activity_name: string | null;
  activity_name_hi: string | null;
  activity_color: string | null;
  activity_sort: number | null;
  photo_count: number;
};

export type ProgramViewData = {
  programs: ProgramSummary[];
  rows: ProgramTreeRow[];
};
