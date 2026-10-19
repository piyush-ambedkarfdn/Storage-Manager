import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { toApiError } from "@/lib/options";
import { customDaySchema } from "@/lib/schemas/days";

/** POST (admin): add a day of your own (local festival, organisation day, a moving date for one year). */
export const POST = handle(async (req) => {
  const { profile, supabase } = await assertAdmin();
  const input = await parseBody(customDaySchema, req);
  const { data, error } = await supabase.from("custom_days").insert({ ...input, created_by: profile.id }).select("id").single();
  if (error) throw toApiError(error);
  await logActivity({ action: "custom_day_created", entityType: "custom_day", entityId: data.id, detail: { name: input.name } });
  return { id: data.id };
});
