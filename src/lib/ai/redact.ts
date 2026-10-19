/**
 * Free tier: Google may use prompts to improve its products, so report text is cleaned BEFORE every
 * Gemini call. Best effort, not a guarantee: phone numbers, ID-like numbers, emails, names after common
 * Hindi/English honorifics, and the names of our own staff are replaced. Never paste sensitive data into reports.
 */

const PHONE = /(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g;
const LONG_NUMBER = /(?<!\d)\d(?:[\s-]?\d){9,}(?!\d)/g; // 10+ digits: phones, accounts, Aadhaar
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const EN_HONORIFIC = /\b(?:Mr|Mrs|Ms|Miss|Smt|Shri|Sri|Dr|Kumari|Km)\.?\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?/g;
const EN_NAMED = /\b(?:named|called|name is|namely)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?/gi;
const HI_HONORIFIC = /(?:श्रीमती|श्री|सुश्री|कुमारी|डॉ\.?|मास्टर)\s*[\u0900-\u097F]+(?:\s+[\u0900-\u097F]+)?/g;
const HI_NAMED = /(?:नाम|नामक)\s*[:：]?\s*[\u0900-\u097F]+(?:\s+[\u0900-\u097F]+)?/g;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function redactReport(text: string | null | undefined, opts: { knownNames?: string[] } = {}): string {
  if (!text) return "";
  let out = text
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[phone]")
    .replace(LONG_NUMBER, "[number]")
    .replace(EN_HONORIFIC, "[name]")
    .replace(EN_NAMED, (m) => m.replace(/\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?$/, " [name]"))
    .replace(HI_HONORIFIC, "[नाम]")
    .replace(HI_NAMED, "नाम [नाम]");
  for (const full of opts.knownNames ?? []) {
    for (const part of full.split(/\s+/).filter((p) => p.length >= 3)) {
      out = out.replace(new RegExp(`(?<![\\p{L}])${escape(part)}(?![\\p{L}])`, "giu"), "[staff]");
    }
  }
  return out;
}
