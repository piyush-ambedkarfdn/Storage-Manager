import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { listSuggestions } from "@/lib/stories/queries";

/** GET ?status=new|accepted|dismissed (admin). */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  const status = new URL(req.url).searchParams.get("status");
  return { suggestions: await listSuggestions(session, status === "accepted" || status === "dismissed" ? status : "new") };
});
