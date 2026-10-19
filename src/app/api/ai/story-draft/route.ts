import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { assertAiReady } from "@/lib/ai/safety";
import { draftStory } from "@/lib/ai/stories";
import { aiDraftSchema } from "@/lib/schemas/story";

export const maxDuration = 60;

/** POST { storyId, language, tone } (admin): writes the draft from the linked reports. Needs review before "ready". */
export const POST = handle(async (req) => {
  assertAiReady();
  const session = await assertAdmin();
  const { storyId, language, tone } = await parseBody(aiDraftSchema, req);
  return { story: await draftStory(session, storyId, language, tone) };
});
