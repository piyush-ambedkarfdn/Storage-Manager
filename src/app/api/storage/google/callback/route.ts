import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRootFolder } from "@/lib/storage/drive-provider";
import { forgetCachedClient, getConnection, oauthClient } from "@/lib/storage/google-auth";
import { encryptSecret, verifyToken } from "@/lib/storage/secrets";
import { requireEnv } from "@/lib/env";
import { APP } from "@/config/app";

const back = (req: Request, result: string) => NextResponse.redirect(new URL(`/admin/storage?google=${result}`, req.url));

/**
 * GET: Google sends the admin back here. Exchanges the code, creates the app's folder, and stores the
 * refresh token encrypted (server-only table). Never changes the active storage by itself.
 */
export async function GET(req: Request) {
  try {
    const { profile, supabase } = await assertAdmin();
    const url = new URL(req.url);
    if (url.searchParams.get("error")) return back(req, "cancelled");
    const state = verifyToken<{ uid: string }>(url.searchParams.get("state") ?? "");
    const code = url.searchParams.get("code");
    if (!state || state.uid !== profile.id || !code) return back(req, "expired");

    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return back(req, "no-refresh-token");
    client.setCredentials(tokens);

    let email: string | null = null;
    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: requireEnv("GOOGLE_CLIENT_ID") });
      email = ticket.getPayload()?.email ?? null;
    }

    // Photos already in Drive belong to the connected account; refuse a different account while they exist.
    const previous = await getConnection();
    if (previous && previous.account_email && email && previous.account_email !== email) {
      const { count } = await supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("storage_provider", "gdrive")
        .neq("status", "purged");
      if (count) {
        await client.revokeCredentials().catch(() => undefined);
        return back(req, "other-account");
      }
    }

    const rootFolderId = await createRootFolder(client, `${APP.name} photos`);
    const admin = createAdminClient();
    await admin.from("storage_folders").delete().eq("provider", "gdrive");
    const { error } = await admin.from("storage_connections").upsert({
      provider: "gdrive",
      account_email: email,
      root_folder_id: rootFolderId,
      refresh_token_enc: encryptSecret(tokens.refresh_token),
      connected_by: profile.id,
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    forgetCachedClient();
    await logActivity({ action: "storage_connected", detail: { provider: "gdrive", account: email } });
    return back(req, "connected");
  } catch (err) {
    console.error("[google callback]", err);
    return back(req, "failed");
  }
}
