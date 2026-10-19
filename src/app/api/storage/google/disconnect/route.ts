import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProviderName } from "@/lib/storage";
import { forgetCachedClient, getConnection, oauthClient } from "@/lib/storage/google-auth";
import { decryptSecret } from "@/lib/storage/secrets";

/** POST (admin): removes the Google Drive connection. Refused while Drive is active or holds photos. */
export const POST = handle(async () => {
  const { supabase } = await assertAdmin();
  if ((await getActiveProviderName()) === "gdrive") {
    throw new ApiError(409, "Google Drive is where new photos go. Switch to Cloudflare R2 first.");
  }
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("storage_provider", "gdrive")
    .neq("status", "purged");
  if (count) {
    throw new ApiError(409, `${count} photos are stored in Google Drive. Move them to R2 first (Storage manager), then disconnect.`);
  }
  const conn = await getConnection();
  if (conn) {
    try {
      const client = oauthClient();
      await client.revokeToken(decryptSecret(conn.refresh_token_enc));
    } catch {
      // the token may already be revoked; removing it here is what matters
    }
  }
  const admin = createAdminClient();
  await admin.from("storage_connections").delete().eq("provider", "gdrive");
  await admin.from("storage_folders").delete().eq("provider", "gdrive");
  forgetCachedClient();
  await logActivity({ action: "storage_disconnected", detail: { provider: "gdrive", account: conn?.account_email ?? null } });
  return { ok: true };
});
