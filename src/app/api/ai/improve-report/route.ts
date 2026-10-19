import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { analyseReport } from "@/lib/ai/jobs";
import { assertAiReady } from "@/lib/ai/safety";

export const maxDuration = 60;

/** POST { reportId, hindi?, style? } (admin): writes a new AI version (draft). The staff text never changes. */
export const POST = handle(async (req) => {
  assertAiReady();
  await assertAdmin();
  const { reportId, hindi, style } = await parseBody(
    z.object({ reportId: z.uuid(), hindi: z.boolean().optional(), style: z.enum(["shorter", "formal"]).optional() }),
    req,
  );
  return analyseReport(reportId, { hindi, style, force: true });
});
