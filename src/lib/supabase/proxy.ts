import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { APP } from "@/config/app";

const PUBLIC_PATHS = ["/login"];

/**
 * Runs before every page request (see src/proxy.ts):
 * refreshes the Supabase session, sends signed-out people to /login, keeps non-admins out of /admin,
 * signs out deactivated accounts, forces /change-password, and updates last_seen_at every few minutes.
 * API routes only get the session refresh: they check access themselves with assertUser/assertAdmin.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {  
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        cacheHeaders = { ...cacheHeaders, ...headers };
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it can cause random sign-outs.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) return response;

  const redirectTo = (target: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    Object.entries(cacheHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!userId) {
    if (isPublic) return response;
    return redirectTo("/login", path === "/" ? {} : { next: path + request.nextUrl.search });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, must_change_password, last_seen_at")
    .eq("id", userId)
    .maybeSingle();

  // if (!profile || !profile.active) {
  //   await supabase.auth.signOut();
  //   return redirectTo("/login", { reason: profile ? "inactive" : "no-profile" });
  // }
  if (!profile || !profile.active) {
    // Signed in, but no staff profile (or switched off): sign out and explain on the login page.
    await supabase.auth.signOut();
    if (isPublic) return response; // already on /login: show the message instead of redirecting again
    return redirectTo("/login", { reason: profile ? "inactive" : "no-profile" });
  }
  
  if (profile.must_change_password && path !== "/change-password") {
    return redirectTo("/change-password");
  }
  if (isPublic) return redirectTo("/");
  if (path.startsWith("/admin") && profile.role !== "admin") return redirectTo("/");

  const lastSeen = profile.last_seen_at ? Date.parse(profile.last_seen_at) : 0;
  if (Date.now() - lastSeen > APP.lastSeenEveryMs) {
    await supabase.rpc("touch_last_seen");
  }

  return response;
}
