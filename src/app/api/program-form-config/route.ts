import { handle } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { loadAllProgramFormConfigs } from "@/lib/program-form/server";

/** GET (any signed-in person): the saved upload-form setting of each program (programs without one ask everything). */
export const GET = handle(async () => {
  const { supabase } = await assertUser();
  return { configs: await loadAllProgramFormConfigs(supabase) };
});
