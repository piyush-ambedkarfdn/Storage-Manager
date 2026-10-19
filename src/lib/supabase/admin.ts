import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireEnv } from "@/lib/env";

/**
 * Service-role client (secret key). Bypasses row-level security.
 * Use ONLY for the auth admin API (creating staff) and for cron jobs, always after assertAdmin() or a cron secret check.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl, requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
