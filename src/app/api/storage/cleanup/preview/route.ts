import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { cleanupFiltersSchema } from "@/lib/schemas/cleanup";
import { previewCleanup } from "@/lib/storage/cleanup";

/** POST filters (admin): how many photos and bytes a cleanup would touch. Changes nothing. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  return previewCleanup(session, await parseBody(cleanupFiltersSchema, req));
});
