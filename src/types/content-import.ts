export type ImportResult = { import_id: string; total: number; imported: number; skipped: number; options_added: number };

export type ImportRecord = {
  id: string;
  file_name: string;
  size_bytes: number;
  rows_in_file: number;
  rows_imported: number;
  rows_skipped: number;
  options_added: number;
  storage_provider: "r2" | "gdrive";
  created_at: string;
};
