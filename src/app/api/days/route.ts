import { handle, parseQuery } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { AWARENESS_DAYS } from "@/config/awareness-days";
import { upcomingDays } from "@/lib/days/upcoming";
import { toApiError } from "@/lib/options";
import { daysQuery } from "@/lib/schemas/days";
import type { CustomDay } from "@/types/days";

/** GET ?from&to&all=1 (admin): built-in and custom days in the range; all=1 includes hidden built-in days. */
export const GET = handle(async (req) => {
  const { supabase } = await assertAdmin();
  const { from, to, all } = parseQuery(daysQuery, req.url);
  const [{ data: customs, error }, { data: setting }] = await Promise.all([
    supabase.from("custom_days").select("id, name, name_hi, month, day, year, scope, tags, note"),
    supabase.from("app_settings").select("value").eq("key", "hidden_days").maybeSingle(),
  ]);
  if (error) throw toApiError(error);
  const hidden = Array.isArray(setting?.value) ? (setting.value as string[]) : [];
  return { days: upcomingDays(from, to, AWARENESS_DAYS, (customs ?? []) as CustomDay[], hidden, { includeHidden: all === "1" }) };
});
