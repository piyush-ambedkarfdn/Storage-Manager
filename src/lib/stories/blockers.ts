import type { ContentPhoto } from "@/types/content";
import type { Story, StoryBlocker } from "@/types/story";

/**
 * What stops a story from being marked ready (also enforced in the database by guard_story_status):
 * a photo without consent "yes", or an AI-written draft nobody has reviewed. Children are a warning only.
 */
export function storyBlockers(photos: ContentPhoto[]): StoryBlocker[] {
  return [
    ...photos.filter((p) => p.consent !== "yes").map((p) => ({ photo_id: p.id, reason: "no_consent" as const })),
    ...photos.filter((p) => p.consent === "yes" && p.has_children).map((p) => ({ photo_id: p.id, reason: "children" as const })),
  ];
}

export function readyProblems(story: Pick<Story, "ai_generated" | "reviewed_at">, blockers: StoryBlocker[]): ("no_consent" | "not_reviewed")[] {
  const out: ("no_consent" | "not_reviewed")[] = [];
  if (blockers.some((b) => b.reason === "no_consent")) out.push("no_consent");
  if (story.ai_generated && !story.reviewed_at) out.push("not_reviewed");
  return out;
}
