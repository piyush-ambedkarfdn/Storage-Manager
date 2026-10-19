import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadReportContext, reportsBlock } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { briefSchema, postContext } from "@/lib/ai/schemas";

/** POST post context (admin): a short content brief for the design team. */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertAdmin();
  const c = await parseBody(postContext, req);
  const { reports } = await loadReportContext(c.photoIds);
  const { data, model, fellBack } = await generateJson({
    kind: "flash",
    purpose: "brief",
    system: await system(TASKS.brief),
    input: `Post title: ${c.title} · platform: ${c.platform ?? "—"} · format: ${c.format ?? "—"} · goal: ${c.goal ?? "—"}\n\nField reports:\n${reportsBlock(reports)}`,
    schema: briefSchema,
  });
  return { brief: data.brief, model, fellBack };
});
