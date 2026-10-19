import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadReportContext, reportsBlock } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { captionsSchema, postContext } from "@/lib/ai/schemas";


/** POST post context (admin): 3 captions written from the field reports of the attached photos. */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertAdmin();
  const c = await parseBody(postContext, req);
  const { reports, descriptions } = await loadReportContext(c.photoIds);
  const language = c.language === "hi" ? "Hindi (Devanagari)" : c.language === "both" ? "English, then the same in Hindi" : "English";
  const { data, model, fellBack } = await generateJson({
    kind: "flash",
    purpose: "caption",
    system: await system(TASKS.captions(c.platform ?? null, language)),
    input: `Post title: ${c.title || "—"} · format: ${c.format ?? "—"} · goal: ${c.goal ?? "—"}\n\nField reports:\n${reportsBlock(reports)}\n\nPhoto descriptions:\n${descriptions.join("\n") || "—"}`,
    schema: captionsSchema,
  });
  return { captions: data.captions, model, fellBack };
});
