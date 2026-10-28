import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { listPending } from "@/lib/review/server";

/** GET (admin): the photos waiting for review, newest first. */
export const GET = handle(async () => {
  const session = await assertAdmin();
  return { photos: await listPending(session) };
});
