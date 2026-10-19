import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { setProviderSchema } from "@/lib/schemas/storage";
import { getActiveProviderName, getProvider } from "@/lib/storage";
import { getConnection, googleAppConfigured } from "@/lib/storage/google-auth";
import type { ProviderStatus } from "@/types/storage";

/** GET (admin): which storage new uploads go to, and whether each one is set up. */
export const GET = handle(async (): Promise<ProviderStatus> => {
  await assertAdmin();
  const [active, r2, conn] = await Promise.all([getActiveProviderName(), getProvider("r2").isConfigured(), getConnection()]);
  return {
    active,
    r2: { configured: r2 },
    gdrive: {
      configured: googleAppConfigured() && !!conn?.root_folder_id,
      appConfigured: googleAppConfigured(),
      connection: conn ? { account_email: conn.account_email, root_folder_id: conn.root_folder_id, connected_at: conn.connected_at } : null,
    },
  };
});

/** PUT { active } (admin): switch where NEW uploads go. Old photos stay where they are. */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { active } = await parseBody(setProviderSchema, req);
  if (!(await getProvider(active).isConfigured())) {
    throw new ApiError(409, active === "gdrive" ? "Connect Google Drive first." : "Cloudflare R2 is not set up. Fill the R2 values in .env.local and restart.");
  }
  const before = await getActiveProviderName();
  const { error } = await supabase.from("app_settings").upsert({ key: "storage_provider", value: { active } });
  if (error) throw toApiError(error);
  if (before !== active) await logActivity({ action: "storage_provider_changed", detail: { from: before, to: active } });
  return { active };
});
