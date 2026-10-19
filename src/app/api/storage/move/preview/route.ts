import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { moveSchema } from "@/lib/schemas/cleanup";
import { getProvider } from "@/lib/storage";
import { previewMove } from "@/lib/storage/move";

/** POST { from, to } (admin): how many photos and bytes are on `from`, and whether `to` is ready. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { from, to } = await parseBody(moveSchema, req);
  if (!(await getProvider(to).isConfigured())) throw new ApiError(409, "The destination storage is not set up yet.");
  return previewMove(session, from);
});
