import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getStoryDetail } from "@/lib/stories/queries";
import { storyToMarkdown } from "@/lib/stories/export";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET (admin): the story as a Markdown file download. (The HTML page is built in the browser from the
 * same Markdown with react-markdown, raw HTML switched off.)
 */
export const GET = handle<Ctx>(async (_req, ctx) => {
  const session = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This story does not exist.");
  const { story, photos } = await getStoryDetail(session, id);
  const md = storyToMarkdown(story, photos);
  const name = (story.title.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "story").slice(0, 60);
  await logActivity({ action: "story_exported", entityType: "story", entityId: id, detail: { format: "md" } });
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.md"`,
    },
  });
});
