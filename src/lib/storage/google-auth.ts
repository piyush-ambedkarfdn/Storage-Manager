import "server-only";
import { OAuth2Client } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { optionalEnv, requireEnv } from "@/lib/env";
import { decryptSecret } from "@/lib/storage/secrets";
import type { GoogleConnection } from "@/types/storage";

/**
 * Google Drive sign-in with the organisation's own Google account (OAuth, not a service account:
 * service accounts have no Drive storage of their own). Scope drive.file: the app only sees files it made.
 * The refresh token is stored encrypted in storage_connections, a table only the server can read.
 */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function googleAppConfigured(): boolean {
  return !!(optionalEnv("GOOGLE_CLIENT_ID") && optionalEnv("GOOGLE_CLIENT_SECRET") && optionalEnv("APP_URL"));
}

export function redirectUri(): string {
  return `${requireEnv("APP_URL").replace(/\/+$/, "")}/api/storage/google/callback`;
}

export function oauthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: redirectUri(),
  });
}

export function authUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    scope: [DRIVE_SCOPE, "openid", "email"],
    state,
    include_granted_scopes: false,
  });
}

type ConnectionRow = GoogleConnection & { refresh_token_enc: string };

/** The stored connection (server only; the table has no RLS policies). */
export async function getConnection(): Promise<ConnectionRow | null> {
  const { data } = await createAdminClient()
    .from("storage_connections")
    .select("account_email, root_folder_id, refresh_token_enc, connected_at")
    .eq("provider", "gdrive")
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

let cached: { token: string; client: OAuth2Client } | null = null;

/** An OAuth client signed in as the connected account. The library refreshes access tokens by itself. */
export async function authorizedClient(): Promise<{ client: OAuth2Client; rootFolderId: string }> {
  const conn = await getConnection();
  if (!conn || !conn.root_folder_id) throw new Error("Google Drive is not connected. An admin can connect it on the Storage page.");
  if (!cached || cached.token !== conn.refresh_token_enc) {
    const client = oauthClient();
    client.setCredentials({ refresh_token: decryptSecret(conn.refresh_token_enc) });
    cached = { token: conn.refresh_token_enc, client };
  }
  return { client: cached.client, rootFolderId: conn.root_folder_id };
}

export function forgetCachedClient() {
  cached = null;
}
