import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { findSimilar } from "@/lib/names";
import { system, TASKS } from "@/lib/ai/prompts";
import { assertAiReady } from "@/lib/ai/safety";
import { nameCheckSchema } from "@/lib/ai/schemas";

/**
 * POST { type, input, parent? }: second opinion when the spelling check is unsure, e.g. Devanagari typed
 * against English names. Text only, one small Lite request. Returns { same, match: {id,name} | null, reason }.
 */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertUser();
  const { type, input, parent } = await parseBody(
    z.object({ type: z.enum(["program", "block", "panchayat", "village"]), input: z.string().trim().min(1).max(120), parent: z.uuid().optional() }),
    req,
  );
  const candidates = (await findSimilar(type, input, parent)).slice(0, 5);
  if (!candidates.length) return { same: false, match: null, reason: "No candidates." };
  const coded = candidates.map((c, i) => ({ code: `C${i + 1}`, ...c }));
  const { data } = await generateJson({
    kind: "lite",
    purpose: "name-check",
    system: await system(TASKS.nameCheck),
    input: `Typed: ${input}\nCandidates:\n${coded.map((c) => `${c.code}: ${c.name}`).join("\n")}`,
    schema: nameCheckSchema,
  });
  const match = data.same ? coded.find((c) => c.code === data.match_code) : undefined;
  return { same: !!match, match: match ? { id: match.id, name: match.name } : null, reason: data.reason };
});
