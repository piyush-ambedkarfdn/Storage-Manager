import { handle, parseQuery } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { exactMatch, findSimilar, SIMILARITY } from "@/lib/names";
import { similarQuery } from "@/lib/schemas/places";

/**
 * GET ?type=village&q=Chhatra&parent=<panchayat id>
 * Returns { matches, exact, warn } for the "Did you mean?" check. Any active user (staff use it while uploading).
 */
export const GET = handle(async (req) => {
  await assertUser();
  const { type, q, parent } = parseQuery(similarQuery, req.url);
  const matches = await findSimilar(type, q, parent);
  const exact = exactMatch(matches, parent);
  const warn = exact ? [] : matches.filter((m) => m.score >= SIMILARITY.warn);
  return { matches, exact, warn };
});
