import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { countPending } from "@/lib/review/server";

/** GET (admin): how many photos are waiting for review (shown on the sidebar). */
export const GET = handle(async () => {
  const session = await assertAdmin();
  return { count: await countPending(session) };
});
