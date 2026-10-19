/** Program categories: each program's own ways to sort photos (e.g. GOONJ → Stage: Before / During / After). */
export type ProgramFieldOption = {
  id: string;
  field_id: string;
  value: string;
  value_hi: string | null;
  color: string | null;
  sort_order: number;
  hidden: boolean;
};

export type ProgramField = {
  id: string;
  program_id: string;
  label: string;
  label_hi: string | null;
  /** false: pick one; true: pick several */
  multiple: boolean;
  required: boolean;
  sort_order: number;
  hidden: boolean;
  options: ProgramFieldOption[];
  program_name?: string;
};

/** Chosen options per category: fieldId → optionIds. */
export type FieldValues = Record<string, string[]>;
