import { handle } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

/** Called by the login form right after a successful sign-in. Logs it and updates last_seen_at. */
export const POST = handle(async () => {
  const { supabase } = await assertUser();
  await supabase.rpc("touch_last_seen");
  await logActivity({ action: "login" });
  return { ok: true };
});
