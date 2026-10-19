"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Renders story Markdown safely (raw HTML is never rendered). "[confirm: …]" markers stand out. */
export function MarkdownPreview({ markdown, className, id }: { markdown: string; className?: string; id?: string }) {
  const marked = markdown.replace(/\[(confirm|पुष्टि करें):([^\]]*)\]/g, "**⚠ [$1:$2]**");
  return (
    <div
      id={id}
      className={cn(
        "max-w-none leading-relaxed [&_blockquote]:border-l-4 [&_blockquote]:border-marigold [&_blockquote]:pl-3 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-1 [&_th]:border [&_th]:p-1 [&_ul]:list-disc",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>
        {marked}
      </Markdown>
    </div>
  );
}
