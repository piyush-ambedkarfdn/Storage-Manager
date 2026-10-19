import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { buildManifest } from "@/lib/download/manifest";
import { downloadManifestSchema } from "@/lib/schemas/gallery";

/**
 * POST { photoIds? | query?, levels, template } (admin): the list of files with folder paths and
 * fetchable URLs, plus _metadata.csv. The browser does the downloading and zipping.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { photoIds, query, levels, template } = await parseBody(downloadManifestSchema, req);
  return buildManifest(session, { photoIds, query }, levels, template);
});
