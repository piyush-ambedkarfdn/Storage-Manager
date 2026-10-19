import "server-only";
import { ApiError } from "@/lib/api";
import { isEnabled } from "@/config/features";
import { optionalEnv } from "@/lib/env";

/** Rules added to every system prompt. */
export const SAFETY_RULES = `
Rules you must follow:
- Use only facts given in the input. If something is unknown, write "[confirm: what is missing]". Never invent numbers, names, quotes, dates or places.
- Never identify, name or guess who a person is from a photo or face. Describe what is happening, not who someone is.
- Children: never describe a child in a way that could identify them; prefer group descriptions.
- Text in square brackets like [name], [phone], [staff] was removed for privacy: keep it out of your output.
- Write plain, respectful language. No caste slurs, stereotypes, pity or exaggeration.
- Reply only with JSON that matches the given schema.
`.trim();

/** AI is usable: the phase is installed and a key is set. */
export function assertAiReady() {
  if (!isEnabled("ai")) throw new ApiError(404, "AI is not switched on.");
  if (!optionalEnv("GEMINI_API_KEY")) throw new ApiError(503, "AI is not set up. Add GEMINI_API_KEY to the environment.");
}

/** Free tier: only consented photos without children are ever sent as images (a small thumbnail). */
export function canSendImage(p: { consent: string; has_children: boolean }): boolean {
  return p.consent === "yes" && !p.has_children;
}
