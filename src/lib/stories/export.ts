import type { Story } from "@/types/story";

const KIND_LABEL = { impact_story: "Impact story", case_study: "Case study", campaign: "Campaign" } as const;

/** Markdown file: title, summary, body, campaign plan, and the photos to use (file names to download). */
export function storyToMarkdown(story: Story, photos: { id: string; village_name: string | null }[]): string {
  const lines: string[] = [`# ${story.title}`, "", `*${KIND_LABEL[story.kind]}*`, ""];
  if (story.summary) lines.push(`> ${story.summary.replace(/\n/g, "\n> ")}`, "");
  lines.push(story.body_md.trim(), "");
  const p = story.plan;
  if (story.kind === "campaign" && p) {
    lines.push("## Campaign plan", "");
    if (p.goal) lines.push(`**Goal:** ${p.goal}`, "");
    if (p.audience) lines.push(`**Audience:** ${p.audience}`, "");
    if (p.key_messages.length) lines.push("**Key messages**", "", ...p.key_messages.map((m) => `- ${m}`), "");
    if (p.channels.length) lines.push(`**Channels:** ${p.channels.join(", ")}`, "");
    if (p.timeline) lines.push(`**Timeline:** ${p.timeline}`, "");
    if (p.ctas.length) lines.push(`**Calls to action:** ${p.ctas.join(" · ")}`, "");
    if (p.hashtags.length) lines.push(`**Hashtags:** ${p.hashtags.join(" ")}`, "");
    if (p.posts.length) {
      lines.push("| Date | Platform | Format | Title |", "|---|---|---|---|");
      p.posts.forEach((x) => lines.push(`| ${x.date ?? ""} | ${x.platform} | ${x.format} | ${x.title.replace(/\|/g, "/")} |`));
      lines.push("");
    }
  }
  if (photos.length) {
    lines.push("## Photos", "", ...photos.map((ph, i) => `${i + 1}. ${ph.village_name ?? "Photo"} (${ph.id})`), "");
  }
  return lines.join("\n");
}

/** A standalone HTML page around already-rendered (sanitised) story HTML. */
export function storyHtmlPage(title: string, bodyHtml: string, lang: "en" | "hi"): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font-family:system-ui,"Noto Sans Devanagari",sans-serif;line-height:1.65;color:#14213a;max-width:42rem;margin:2rem auto;padding:0 1rem}
h1,h2,h3{line-height:1.25}blockquote{border-left:4px solid #e3a21a;margin:1rem 0;padding:.25rem 1rem;color:#4f5f79}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #d5deea;padding:.4rem;text-align:left}
@media (prefers-color-scheme:dark){body{background:#0e1622;color:#e7eef8}td,th{border-color:#2a3c58}}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
