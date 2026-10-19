import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { staffNames } from "@/lib/ai/org-context";
import { system, TASKS, themesBlock } from "@/lib/ai/prompts";
import { reportText, themeCodesToIds, themeList } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { themesSchema } from "@/lib/ai/schemas";

const part = z.string().max(2000).default("");

/** POST { report_parts }: theme suggestions while staff type the report (they confirm). */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertUser();
  const { report_parts } = await parseBody(
    z.object({ report_parts: z.object({ what_happened: part, problem: part, who_affected: part, result: part }) }),
    req,
  );
  const [themes, names] = await Promise.all([themeList(), staffNames()]);
  const { data } = await generateJson({
    kind: "lite",
    purpose: "themes",
    system: await system(TASKS.suggestThemes),
    input: `Problem themes:\n${themesBlock(themes)}\n\nField report:\n${reportText(report_parts, null, names)}`,
    schema: themesSchema,
  });
  return { theme_ids: themeCodesToIds(data.theme_codes, themes) };
});
