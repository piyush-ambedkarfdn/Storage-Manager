import { handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { buildMyManifest } from "@/lib/download/my-manifest";
import { myDownloadSchema } from "@/lib/schemas/my-download";

/**
 * POST { photoIds? | all? } (any signed-in person): the download list for their OWN photos, organised
 * Village / Activity type / photo. The browser downloads and zips the files.
 */
export const POST = handle(async (req) => {
  const session = await assertUser();
  const input = await parseBody(myDownloadSchema, req);
  return buildMyManifest(session, input);
});
