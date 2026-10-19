export type Role = "admin" | "uploader";

/** A row of the `profiles` table (migration 0001), plus the sign-in email from the session. */
export type Profile = {
  id: string;
  full_name: string | null;
  login_id: string | null;
  role: Role;
  active: boolean;
  must_change_password: boolean;
  assigned_district_ids: string[] | null;
  assigned_program_ids: string[] | null;
  last_seen_at: string | null;
  created_at: string;
  email: string | null;
};

export const PROFILE_COLUMNS =
  "id, full_name, login_id, role, active, must_change_password, assigned_district_ids, assigned_program_ids, last_seen_at, created_at";
