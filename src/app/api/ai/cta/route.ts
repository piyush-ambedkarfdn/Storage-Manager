import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { assertAiReady } from "@/lib/ai/safety";
import { ctaSchema, postContext } from "@/lib/ai/schemas";

/** POST post context (admin): three short calls to action. */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertAdmin();
  const c = await parseBody(postContext, req);
  const { data, model } = await generateJson({
    kind: "lite",
    purpose: "cta",
    system: await system(TASKS.cta(c.goal ?? null)),
    input: `Post title: ${c.title} · platform: ${c.platform ?? "—"}`,
    schema: ctaSchema,
  });
  return { cta: data.cta, model };
});
