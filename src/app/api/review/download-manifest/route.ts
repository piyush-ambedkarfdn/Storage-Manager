import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { buildReviewManifest } from "@/lib/download/review-manifest";
import { reviewDownloadSchema } from "@/lib/schemas/review";

/**
 * POST { photoIds? | all? } (admin): the download list for photos waiting for review, organised
 * Village / Activity type / photo. The browser downloads and zips the files.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const input = await parseBody(reviewDownloadSchema, req);
  return buildReviewManifest(session, input);
});
