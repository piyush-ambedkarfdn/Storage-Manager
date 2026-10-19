import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api";
import { PROFILE_COLUMNS, type Profile } from "@/types/profile";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
export type Session = { profile: Profile; supabase: SupabaseServer };

const loadSession = cache(async (): Promise<{ profile: Profile | null; supabase: SupabaseServer }> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { profile: null, supabase };
  const { data: row } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", claims.sub).maybeSingle();
  if (!row) return { profile: null, supabase };
  const email = typeof claims.email === "string" ? claims.email : null;
  return { profile: { ...(row as Omit<Profile, "email">), email }, supabase };
});

/** The signed-in person's profile, or null. Cached for the duration of one request. */
export async function getSessionProfile(): Promise<Profile | null> {
  return (await loadSession()).profile;
}

/** Server components: any active, signed-in user. Redirects otherwise. */
export async function requireUser(): Promise<Session> {
  const { profile, supabase } = await loadSession();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?reason=inactive");
  if (profile.must_change_password) redirect("/change-password");
  return { profile, supabase };
}

/** Server components: admins only. Others go to the home page. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/");
  return session;
}

/** Route handlers: any active, signed-in user. Throws ApiError 401/403. */
export async function assertUser(): Promise<Session> {
  const { profile, supabase } = await loadSession();
  if (!profile) throw new ApiError(401, "Please sign in again.");
  if (!profile.active) throw new ApiError(403, "This account is switched off. Ask an admin.");
  return { profile, supabase };
}

/** Route handlers: admins only. Throws ApiError 401/403. */
export async function assertAdmin(): Promise<Session> {
  const session = await assertUser();
  if (session.profile.role !== "admin") throw new ApiError(403, "Only admins can do this.");
  return session;
}
