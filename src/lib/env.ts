/**
 * Environment values.
 * - publicEnv: safe for the browser (NEXT_PUBLIC_*). Each value is read by its literal name so Next.js can inline it.
 * - requireEnv / optionalEnv: server-only values. Every key the app will ever use is declared here,
 *   so later phases never edit this file.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Photo Organiser",
  loginDomain: process.env.NEXT_PUBLIC_LOGIN_DOMAIN ?? "org.local",
};

export const SERVER_ENV_KEYS = [
  // phase 1
  "SUPABASE_SECRET_KEY",
  // phase 4: storage (Cloudflare R2 and Google Drive)
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_THUMB_BASE_URL",
  "STORAGE_LIMIT_BYTES",
  "APP_URL",
  "SECRETS_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  // phase 7: daily purge
  "CRON_SECRET",
  // phase 8: Gemini (free tier)
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_MODEL_LITE",
  "GEMINI_DAILY_LIMIT",
  "GEMINI_DAILY_LIMIT_LITE",
  "GEMINI_RPM",
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

/** Older names that still work. */
const ALIASES: Partial<Record<ServerEnvKey, string>> = {
  SUPABASE_SECRET_KEY: "SUPABASE_SERVICE_ROLE_KEY",
};

export function optionalEnv(key: ServerEnvKey): string | undefined {
  if (typeof window !== "undefined") {
    throw new Error(`${key} is a server-only value and cannot be read in the browser.`);
  }
  const value = process.env[key] ?? (ALIASES[key] ? process.env[ALIASES[key]!] : undefined);
  return value && value.trim() !== "" ? value : undefined;
}

export function requireEnv(key: ServerEnvKey): string {
  const value = optionalEnv(key);
  if (!value) {
    throw new Error(`Missing environment value ${key}. Add it to .env.local (see .env.example) and restart.`);
  }
  return value;
}
