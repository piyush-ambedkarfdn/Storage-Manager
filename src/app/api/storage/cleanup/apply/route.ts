import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { cleanupApplySchema } from "@/lib/schemas/cleanup";
import { applyCleanup } from "@/lib/storage/cleanup";

export const maxDuration = 60;

/** POST { filters, action: "trash" | "archive", batch } (admin). Archive: call again until remaining = 0. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { filters, action, batch } = await parseBody(cleanupApplySchema, req);
  return applyCleanup(session, filters, action, batch);
});
