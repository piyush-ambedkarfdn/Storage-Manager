import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { decide } from "@/lib/review/server";
import { reviewDecisionSchema } from "@/lib/schemas/review";

/** POST { ids, decision: "approve" | "reject", note? } (admin): decide on waiting photos. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { ids, decision, note } = await parseBody(reviewDecisionSchema, req);
  return decide(session, ids, decision === "approve", note);
});
