import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed context for every prompt. EDIT the ORGANISATION text below to describe your organisation.
 * Programs and districts are read from the database so they stay current.
 */
const ORGANISATION = `
We are a non-profit organisation working with Dalit, Adivasi and other marginalised communities in rural Jharkhand, India.
Our work: rights and entitlements (documents, social security schemes, land), education, livelihoods and self-help groups,
and civic participation, inspired by the Constitution of India and Dr B. R. Ambedkar.
Audience on social media: supporters, donors, government partners and community members, in English and Hindi.
Tone: respectful, factual, hopeful, never pitying. People are shown as agents of change, not as victims.
Never: name or identify a person from a photo or face; invent numbers, quotes, names or places; promise results;
use caste slurs or stereotypes; reveal phone numbers, ID numbers or addresses; write political party content.
`.trim();

let cache: { at: number; text: string } | null = null;

export async function orgContext(): Promise<string> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.text;
  const admin = createAdminClient();
  const [{ data: programs }, { data: districts }] = await Promise.all([
    admin.from("programs").select("name").eq("hidden", false).order("sort_order"),
    admin.from("districts").select("name").order("name"),
  ]);
  const text = [
    ORGANISATION,
    `Programs: ${(programs ?? []).map((p) => p.name).join(", ") || "—"}.`,
    `Districts we work in: ${(districts ?? []).map((d) => d.name).join(", ") || "—"} (Jharkhand).`,
  ].join("\n");
  cache = { at: Date.now(), text };
  return text;
}

/** Names of our staff, removed from report text before it is sent. */
export async function staffNames(): Promise<string[]> {
  const { data } = await createAdminClient().from("profiles").select("full_name");
  return (data ?? []).map((p) => p.full_name as string | null).filter((n): n is string => !!n && n.trim().length > 2);
}
