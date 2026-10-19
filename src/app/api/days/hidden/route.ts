import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { AWARENESS_DAYS } from "@/config/awareness-days";
import { toApiError } from "@/lib/options";
import { hideDaySchema } from "@/lib/schemas/days";

/** PUT { id, hidden } (admin): hide or show a built-in day (kept in app_settings.hidden_days). */
export const PUT = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { id, hidden } = await parseBody(hideDaySchema, req);
  if (!AWARENESS_DAYS.some((d) => d.id === id)) throw new ApiError(404, "Only built-in days can be hidden. Delete custom days instead.");
  const { data } = await supabase.from("app_settings").select("value").eq("key", "hidden_days").maybeSingle();
  const list = new Set(Array.isArray(data?.value) ? (data.value as string[]) : []);
  if (hidden) list.add(id);
  else list.delete(id);
  const { error } = await supabase.from("app_settings").upsert({ key: "hidden_days", value: [...list] });
  if (error) throw toApiError(error);
  await logActivity({ action: "custom_day_updated", entityType: "builtin_day", detail: { id, hidden } });
  return { hidden: [...list] };
});
