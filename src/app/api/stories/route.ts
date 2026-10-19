import { handle, parseBody, parseQuery } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { createStory, listStories } from "@/lib/stories/queries";
import { createStorySchema, storyListQuery } from "@/lib/schemas/story";

/** GET ?kind&status (admin). */
export const GET = handle(async (req) => {
  const session = await assertAdmin();
  return { stories: await listStories(session, parseQuery(storyListQuery, req.url)) };
});

/** POST { kind, title, source_report_ids?, theme_ids?, language? } (admin): a new draft written by hand or by AI later. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  return { story: await createStory(session, await parseBody(createStorySchema, req)) };
});
