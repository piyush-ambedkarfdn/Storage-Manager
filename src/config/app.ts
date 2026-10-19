import { publicEnv } from "@/lib/env";

/**
 * App-wide constants. The whole app is designed to run on free tiers:
 * Supabase free, Cloudflare R2 free (10 GB), Google Drive (15 GB on the organisation account),
 * Gemini API free tier, and a free host. Limits change: check them before relying on them.
 */
export const APP = {
  name: publicEnv.appName,
  defaultLocale: "en" as const,
  loginDomain: publicEnv.loginDomain,
  storageDefaults: {
    limitBytes: 10_000_000_000, // R2 free tier: 10 GB
    warnPct: 70,
    amberPct: 85,
    blockPct: 95,
    trashDays: 30,
  },
  /** Gemini free tier budgets (requests per day / per minute). Overridable with env values in phase 8. */
  aiFreeTier: {
    dailyLimitFlash: 20,
    dailyLimitLite: 450,
    requestsPerMinute: 8,
  },
  /** How often the proxy refreshes profiles.last_seen_at. */
  lastSeenEveryMs: 5 * 60 * 1000,
} as const;

/**
 * Staff without an email sign in with a login ID such as "rakesh.chatra".
 * It maps to a hidden email on the login domain: rakesh.chatra@<NEXT_PUBLIC_LOGIN_DOMAIN>.
 */
export function loginIdToEmail(idOrEmail: string): string {
  const v = idOrEmail.trim().toLowerCase();
  if (v.includes("@")) return v;
  return `${v.replace(/\s+/g, ".")}@${APP.loginDomain}`;
}
