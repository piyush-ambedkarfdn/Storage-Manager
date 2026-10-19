import type { Role } from "@/types/profile";

/** One staff account as the admin Staff page sees it. */
export type StaffMember = {
  id: string;
  full_name: string | null;
  login_id: string | null;
  /** The sign-in email. For staff with a login ID this is the hidden <id>@<login domain> address. */
  email: string | null;
  role: Role;
  active: boolean;
  must_change_password: boolean;
  assigned_district_ids: string[] | null;
  assigned_program_ids: string[] | null;
  last_seen_at: string | null;
  created_at: string;
  /** Number of uploaded photos, or null before the upload phase is installed. */
  uploads: number | null;
};

export type BulkRowResult = {
  row: number;
  login: string;
  ok: boolean;
  error?: string;
  /** Only for rows where the CSV had no password and the server made one. */
  password?: string;
};
