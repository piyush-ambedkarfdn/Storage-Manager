import "server-only";
import { orgContext } from "@/lib/ai/org-context";
import { SAFETY_RULES } from "@/lib/ai/safety";
import type { ThemeRef } from "@/lib/ai/report-context";

/** System prompts: who we are + safety rules + the task. User input is built by the routes. */
export async function system(task: string): Promise<string> {
  return `${await orgContext()}\n\n${SAFETY_RULES}\n\nYour task:\n${task.trim()}`;
}

export const themesBlock = (themes: ThemeRef[]) => themes.map((t) => `${t.code}: ${t.name}`).join("\n");

export const TASKS = {
  analyseReport: (hindi: boolean, style?: "shorter" | "formal") => `
A field worker wrote this report (Hindi, English or mixed). Do all of this in one reply:
1. summary: 2-3 short English sentences.
2. problems: one short line per problem people face.
3. theme_codes: 1 to 3 codes from the theme list that fit best.
4. sections: the four answers (what happened, the problem, who was affected, the result) as you understood them, in clear English.
5. report_en: the same facts as clear, complete English sentences${style === "shorter" ? ", as short as possible" : style === "formal" ? ", in a formal tone for reports to partners" : ""}. Do not add anything the report does not say.
6. report_hi: ${hindi ? "the same in simple, respectful Hindi (Devanagari)." : 'an empty string "".'}
7. missing: important facts the report does not give (for example how many people, dates, what is still needed). In report_en mark them as [confirm: …].`,
  suggestThemes: `Pick 1 to 3 problem themes (by code) that match this field report. Only codes from the list.`,
  describePhoto: `Describe this photo from our field work for our photo library: one sentence of what is happening (activity, setting, roughly how many people), 3-8 short lowercase tags, a quality score 1-5 (sharpness, light, composition), and whether it suits a public social media post. Never identify or name anyone.`,
  captions: (platform: string | null, language: string) => `
Write 3 different social media captions for ${platform ?? "social media"} about this post, built ONLY from the field reports and photo descriptions given.
Language: ${language}. Each caption 40-120 words (shorter for X), one clear message, respectful, a natural call to action at the end, no hashtags.
Mark any needed fact that is missing as [confirm: …].`,
  brief: `Write a content brief (4-7 short lines) for the design team: the message, what to show, which photos to use, text on the image, and the call to action. Base it only on the reports given.`,
  hashtags: (platform: string | null) => `Suggest 6-10 hashtags for ${platform ?? "social media"} for this post: a mix of topic tags, Jharkhand / India tags and our program tags. No spaces, start each with #.`,
  cta: (goal: string | null) => `Suggest 3 short calls to action (max 8 words each) for a post whose goal is ${goal ?? "awareness"}.`,
  ideas: (count: number, month: string) => `
From these recent field reports, suggest ${count} social media post ideas for ${month}. Each idea: a short title, a 2-3 line brief, the code of the report it is based on, and a suggested day of the month (spread them out). Prefer reports with clear results and photos the community agreed to share.`,
  monthPlan: (month: string) => `
Plan the social media posts for ${month}: about 2-3 posts a week, using the field reports and the days to plan around. For each: date, title, platform, format, content pillar, a short brief, and why (which report or day).`,
  days: `
Recommend up to 6 national, international or local days (including festivals whose date moves each year) in the given date range that fit these photos and reports. For each: name, date (YYYY-MM-DD), scope, why it fits, and a post angle tied to our work (not a generic greeting). Use the given list first. Set needsDateCheck = true for any date that moves each year or that you are not sure of. Be respectful with religious and community days.`,
  nameCheck: `A field worker typed a place or program name. Decide if it is the same as one of the candidates (spelling variants, Hindi vs English script, missing letters). Answer same=true only if you are confident.`,
};
