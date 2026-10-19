import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { assertAiReady } from "@/lib/ai/safety";
import { suggestStories } from "@/lib/ai/stories";
import { aiSuggestionsSchema } from "@/lib/schemas/story";

export const maxDuration = 60;

/** POST { days } (admin): story, case study and campaign ideas from recent field reports (one request). */
export const POST = handle(async (req) => {
  assertAiReady();
  const session = await assertAdmin();
  const { days } = await parseBody(aiSuggestionsSchema, req);
  return { created: await suggestStories(session, days) };
});
