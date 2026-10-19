import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { moveSchema } from "@/lib/schemas/cleanup";
import { getProvider } from "@/lib/storage";
import { moveBatch } from "@/lib/storage/move";

export const maxDuration = 60;

/**
 * POST { from, to, limit, exclude } (admin): moves one small batch. The browser calls it again and
 * again (passing failed ids in `exclude`) until remaining = 0, so no long server job is needed.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { from, to, limit, exclude } = await parseBody(moveSchema, req);
  if (!(await getProvider(to).isConfigured())) throw new ApiError(409, "The destination storage is not set up yet.");
  return moveBatch(session, from, to, limit, exclude);
});
