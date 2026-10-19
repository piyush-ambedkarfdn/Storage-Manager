import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { setStoryPhotos } from "@/lib/stories/queries";
import { storyPhotosSchema } from "@/lib/schemas/story";

type Ctx = { params: Promise<{ id: string }> };

/** PUT { photo_ids } (admin): the story's photos in order. Ready stories accept only consented photos. */
export const PUT = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This story does not exist.");
  const { photo_ids } = await parseBody(storyPhotosSchema, req);
  await setStoryPhotos(session, id, photo_ids);
  await logActivity({ action: "story_updated", entityType: "story", entityId: id, detail: { photos: photo_ids.length } });
  return { ok: true };
});
