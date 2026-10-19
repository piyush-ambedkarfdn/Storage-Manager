import "server-only";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { requireEnv } from "@/lib/env";
import { reserveCall, type ModelKind } from "@/lib/ai/throttle";

/**
 * The only file that talks to Gemini (free tier). Uses the Interactions API of @google/genai with
 * structured JSON output, store: false. Every call is budgeted (throttle.ts) and logged as 'ai_used'.
 */

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return client;
}

export type InputPart = { type: "text"; text: string } | { type: "image"; data: string; mime_type: "image/jpeg" };

/** JSON Schema for Gemini from a zod schema (without the keywords it does not need). */
function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) if (k !== "$schema" && k !== "additionalProperties") o[k] = strip(v);
      return o;
    }
    return node;
  };
  return strip(out) as Record<string, unknown>;
}

function isRateLimit(err: unknown): boolean {
  return err instanceof GeminiApiError ? err.status === 429 : /429|RESOURCE_EXHAUSTED|quota/i.test(String(err));
}

export async function generateJson<S extends z.ZodType>(opts: {
  kind: ModelKind;
  purpose: string;
  system: string;
  input: string | InputPart[];
  schema: S;
  googleSearch?: boolean;
}): Promise<{ data: z.infer<S>; model: string; fellBack: boolean }> {
  const reserved = await reserveCall(opts.kind);
  const params = {
    model: reserved.model,
    system_instruction: opts.system,
    input: opts.input,
    response_format: { type: "text" as const, mime_type: "application/json" as const, schema: jsonSchema(opts.schema) },
    tools: opts.googleSearch ? [{ type: "google_search" as const }] : undefined,
    store: false,
  };

  let text: string | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai().interactions.create(params as Parameters<GoogleGenAI["interactions"]["create"]>[0]);
      text = (res as { output_text?: string }).output_text;
      break;
    } catch (err) {
      if (isRateLimit(err) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 6_000)); // the free tier asks to slow down: wait once
        continue;
      }
      if (isRateLimit(err)) throw new ApiError(429, "AI budget used for today (free tier). Try again tomorrow.");
      console.error("[gemini]", opts.purpose, err);
      throw new ApiError(502, "The AI service did not answer. Try again in a moment.");
    } finally {
      await logActivity({ action: "ai_used", detail: { model: reserved.model, purpose: opts.purpose, attempt } });
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse((text ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new ApiError(502, "The AI reply could not be read. Try again.");
  }
  const result = opts.schema.safeParse(parsed);
  if (!result.success) throw new ApiError(502, "The AI reply was incomplete. Try again.");
  return { data: result.data, model: reserved.model, fellBack: reserved.fellBack };
}
