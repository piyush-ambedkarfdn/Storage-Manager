import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";
import { system, TASKS } from "@/lib/ai/prompts";
import { loadReportContext } from "@/lib/ai/report-context";
import { assertAiReady } from "@/lib/ai/safety";
import { hashtagsSchema, postContext } from "@/lib/ai/schemas";

/** POST post context (admin): hashtags as one line. Lite model: a cheap task. */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertAdmin();
  const c = await parseBody(postContext, req);
  const { reports } = await loadReportContext(c.photoIds);
  const { data, model } = await generateJson({
    kind: "lite",
    purpose: "hashtags",
    system: await system(TASKS.hashtags(c.platform ?? null)),
    input: `Post title: ${c.title}\nThemes: ${[...new Set(reports.flatMap((r) => r.themes))].join(", ") || "—"}\nProgram: ${reports[0]?.program ?? "—"}`,
    schema: hashtagsSchema,
  });
  const tags = data.hashtags.map((h) => `#${h.replace(/^#+/, "").replace(/\s+/g, "")}`).filter((h) => h.length > 1);
  return { hashtags: [...new Set(tags)].join(" "), model };
});
