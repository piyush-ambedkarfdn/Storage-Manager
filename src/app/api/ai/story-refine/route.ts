import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { assertAiReady } from "@/lib/ai/safety";
import { refineStory } from "@/lib/ai/stories";
import { aiRefineSchema } from "@/lib/schemas/story";

export const maxDuration = 60;

/** POST { storyId, instruction } (admin): "shorter", "add what is still needed"… Same facts only. */
export const POST = handle(async (req) => {
  assertAiReady();
  const session = await assertAdmin();
  const { storyId, instruction } = await parseBody(aiRefineSchema, req);
  return { story: await refineStory(session, storyId, instruction) };
});
