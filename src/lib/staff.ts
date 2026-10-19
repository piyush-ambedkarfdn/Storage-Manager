import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { isEnabled } from "@/config/features";
import { loginIdToEmail } from "@/config/app";
import { PROFILE_COLUMNS, type Profile } from "@/types/profile";
import type { Session } from "@/lib/auth";
import type { StaffMember } from "@/types/staff";
import { BULK_MAX_ROWS, makeTempPassword, type CreateStaffInput } from "@/lib/schemas/staff";

/**
 * Staff account management. Callers must have run assertAdmin() and pass its session.
 * Auth users are created and changed with the service-role client (Supabase auth admin API, server only);
 * profile rows are written with the admin's own session, so row-level security still applies.
 */

const BAN_FOREVER = "876000h"; // about 100 years

function friendlyDbError(message: string): ApiError {
  if (message.includes("last active admin")) {
    return new ApiError(409, "This is the last active admin. Make someone else an admin first.");
  }
  if (message.includes("duplicate key") && message.includes("login_id")) {
    return new ApiError(409, "This login ID is already used. Choose another one.");
  }
  return new ApiError(500, `The database refused the change: ${message}`);
}

async function loadEmails(): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const emails = new Map<string, string | null>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new ApiError(500, `Could not read sign-in accounts: ${error.message}`);
    data.users.forEach((u) => emails.set(u.id, u.email ?? null));
    if (data.users.length < 1000) break;
  }
  return emails;
}

/** Photos uploaded by one person. Returns null before the upload phase (no photos table yet). */
async function countUploads(session: Session, userId: string): Promise<number | null> {
  if (!isEnabled("upload")) return null;
  const { count, error } = await session.supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("uploaded_by", userId);
  return error ? null : (count ?? 0);
}

function toStaff(p: Omit<Profile, "email">, email: string | null, uploads: number | null): StaffMember {
  return {
    id: p.id,
    full_name: p.full_name,
    login_id: p.login_id,
    email,
    role: p.role,
    active: p.active,
    must_change_password: p.must_change_password,
    assigned_district_ids: p.assigned_district_ids,
    assigned_program_ids: p.assigned_program_ids,
    last_seen_at: p.last_seen_at,
    created_at: p.created_at,
    uploads,
  };
}

async function getProfile(session: Session, id: string): Promise<Omit<Profile, "email">> {
  const { data, error } = await session.supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw friendlyDbError(error.message);
  if (!data) throw new ApiError(404, "This staff account does not exist.");
  return data as Omit<Profile, "email">;
}

const displayName = (p: { full_name: string | null; login_id: string | null }) => p.full_name || p.login_id || "";

export async function listStaff(session: Session): Promise<StaffMember[]> {
  const { data, error } = await session.supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw friendlyDbError(error.message);
  const rows = (data ?? []) as Omit<Profile, "email">[];
  const emails = await loadEmails();
  const uploads = await Promise.all(rows.map((r) => countUploads(session, r.id)));
  return rows.map((r, i) => toStaff(r, emails.get(r.id) ?? null, uploads[i]));
}

export async function createStaff(session: Session, input: CreateStaffInput): Promise<StaffMember> {
  const login = input.login.trim().toLowerCase();
  const isEmail = login.includes("@");
  const email = loginIdToEmail(login);
  const loginId = isEmail ? null : login;

  if (loginId) {
    const { data: taken } = await session.supabase.from("profiles").select("id").eq("login_id", loginId).maybeSingle();
    if (taken) throw new ApiError(409, "This login ID is already used. Choose another one.");
  }

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (authError || !created.user) {
    const msg = authError?.message ?? "unknown error";
    if (/already|registered|exists/i.test(msg)) {
      throw new ApiError(409, "An account with this login already exists.");
    }
    throw new ApiError(500, `Could not create the sign-in account: ${msg}`);
  }

  const row = {
    id: created.user.id,
    full_name: input.full_name,
    login_id: loginId,
    role: input.role,
    active: true,
    must_change_password: true,
    assigned_district_ids: input.assigned_district_ids?.length ? input.assigned_district_ids : null,
    assigned_program_ids: input.assigned_program_ids?.length ? input.assigned_program_ids : null,
  };
  const { data: profile, error: profileError } = await session.supabase
    .from("profiles")
    .insert(row)
    .select(PROFILE_COLUMNS)
    .single();
  if (profileError || !profile) {
    // Roll back so no sign-in account exists without a profile.
    await admin.auth.admin.deleteUser(created.user.id);
    throw friendlyDbError(profileError?.message ?? "profile not saved");
  }

  await logActivity({
    action: "user_created",
    entityType: "profile",
    entityId: created.user.id,
    detail: { login, role: input.role },
  });
  return toStaff(profile as Omit<Profile, "email">, email, isEnabled("upload") ? 0 : null);
}

export async function updateStaff(
  session: Session,
  id: string,
  input: {
    full_name: string;
    role: "admin" | "uploader";
    assigned_district_ids?: string[] | null;
    assigned_program_ids?: string[] | null;
  },
): Promise<void> {
  if (id === session.profile.id && input.role !== "admin") {
    throw new ApiError(400, "You cannot remove your own admin role. Ask another admin to do it.");
  }
  const before = await getProfile(session, id);
  const patch: Record<string, unknown> = { full_name: input.full_name, role: input.role };
  if (input.assigned_district_ids !== undefined) {
    patch.assigned_district_ids = input.assigned_district_ids?.length ? input.assigned_district_ids : null;
  }
  if (input.assigned_program_ids !== undefined) {
    patch.assigned_program_ids = input.assigned_program_ids?.length ? input.assigned_program_ids : null;
  }
  const { error } = await session.supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw friendlyDbError(error.message);
  await logActivity({
    action: "user_updated",
    entityType: "profile",
    entityId: id,
    detail: { from: { full_name: before.full_name, role: before.role }, to: { full_name: input.full_name, role: input.role } },
  });
}

/** New temporary password; the person must change it at next sign-in. */
export async function resetPassword(session: Session, id: string, password: string): Promise<void> {
  const target = await getProfile(session, id);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new ApiError(500, `Could not set the password: ${error.message}`);
  const { error: profileError } = await session.supabase
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", id);
  if (profileError) throw friendlyDbError(profileError.message);
  await logActivity({ action: "password_reset", entityType: "profile", entityId: id, detail: { name: displayName(target) } });
}

/**
 * Switch an account off (signed out, cannot sign in; history kept) or on again.
 * The profile changes first, so the database's last-admin guard can refuse before anything else happens.
 */
export async function setActive(session: Session, id: string, active: boolean): Promise<void> {
  if (id === session.profile.id && !active) {
    throw new ApiError(400, "You cannot switch off your own account.");
  }
  const target = await getProfile(session, id);
  const { error } = await session.supabase.from("profiles").update({ active }).eq("id", id);
  if (error) throw friendlyDbError(error.message);

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : BAN_FOREVER });
  if (banError) {
    // Undo the profile change so the two never disagree.
    await session.supabase.from("profiles").update({ active: !active }).eq("id", id);
    throw new ApiError(500, `Could not ${active ? "switch on" : "switch off"} the sign-in: ${banError.message}`);
  }
  await logActivity({
    action: active ? "user_reactivated" : "user_deactivated",
    entityType: "profile",
    entityId: id,
    detail: { name: displayName(target) },
  });
}

/** Delete only accounts with no uploads; everyone else is switched off instead, so history stays intact. */
export async function deleteStaff(session: Session, id: string): Promise<void> {
  if (id === session.profile.id) throw new ApiError(400, "You cannot delete your own account.");
  const target = await getProfile(session, id);

  const uploads = await countUploads(session, id);
  if (uploads && uploads > 0) {
    throw new ApiError(409, `This person has ${uploads} uploads. Switch the account off instead of deleting it.`);
  }
  if (target.role === "admin" && target.active) {
    const { count } = await session.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("active", true)
      .neq("id", id);
    if (!count) throw new ApiError(409, "This is the last active admin. Make someone else an admin first.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id); // the profile row goes with it (on delete cascade)
  if (error) throw new ApiError(500, `Could not delete the account: ${error.message}`);
  await logActivity({
    action: "user_updated",
    entityType: "profile",
    entityId: id,
    detail: { deleted: true, name: displayName(target), login: target.login_id },
  });
}

// ---------- CSV ----------

/** Small RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const HEADER_ALIASES: Record<string, "full_name" | "login" | "password" | "role"> = {
  full_name: "full_name",
  name: "full_name",
  "full name": "full_name",
  login: "login",
  login_id: "login",
  "login id": "login",
  email: "login",
  password: "password",
  temp_password: "password",
  role: "role",
};

export type StaffCsvRow = { row: number; full_name: string; login: string; password: string; role: string; generated: boolean };

/** Reads the staff CSV. Rows without a password get a generated one (flagged so it can be shown to the admin). */
export function readStaffCsv(text: string): StaffCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new ApiError(400, "The file needs a header row and at least one person.");
  const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()]);
  if (!header.includes("full_name") || !header.includes("login")) {
    throw new ApiError(400, "The header row must have at least the columns full_name and login.");
  }
  if (rows.length - 1 > BULK_MAX_ROWS) {
    throw new ApiError(400, `At most ${BULK_MAX_ROWS} people per file. Split the file and try again.`);
  }
  return rows.slice(1).map((cells, i) => {
    const get = (k: string) => (cells[header.indexOf(k as never)] ?? "").trim();
    const given = get("password");
    return {
      row: i + 2,
      full_name: get("full_name"),
      login: get("login").toLowerCase(),
      password: given || makeTempPassword(),
      role: (get("role") || "uploader").toLowerCase(),
      generated: !given,
    };
  });
}
