"use client";

import { useState } from "react";
import { Copy, Download, FileCode, FileText, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DownloadDialog } from "@/components/gallery/DownloadDialog";
import { storyHtmlPage, storyToMarkdown } from "@/lib/stories/export";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { ContentPhoto } from "@/types/content";
import type { Story } from "@/types/story";

function save(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Export: Markdown file (from the server), a standalone web page (built here from the rendered preview,
 * which never contains raw HTML), copy Markdown, and download the story's photos into a folder.
 */
export function ExportMenu({ story, photos, previewId }: { story: Story; photos: ContentPhoto[]; previewId: string }) {
  const t = useT(storiesMessages);
  const [photosOpen, setPhotosOpen] = useState(false);
  const slug = story.title.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60) || "story";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-h-10">
            <Download aria-hidden /> {t("export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(`/api/stories/${story.id}/export`, "_blank")}>
            <FileText aria-hidden /> {t("exportMd")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const el = document.getElementById(previewId);
              const body = `<h1>${story.title.replace(/</g, "&lt;")}</h1>${story.summary ? `<blockquote>${story.summary.replace(/</g, "&lt;")}</blockquote>` : ""}${el?.innerHTML ?? ""}`;
              save(`${slug}.html`, "text/html;charset=utf-8", storyHtmlPage(story.title, body, story.language));
            }}
          >
            <FileCode aria-hidden /> {t("exportHtml")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await navigator.clipboard.writeText(storyToMarkdown(story, photos));
              toast.success(t("copied"));
            }}
          >
            <Copy aria-hidden /> {t("copyMd")}
          </DropdownMenuItem>
          {photos.length ? (
            <DropdownMenuItem onClick={() => setPhotosOpen(true)}>
              <Images aria-hidden /> {t("downloadPhotos")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {photosOpen ? (
        <DownloadDialog open onOpenChange={setPhotosOpen} viewQuery="" viewCount={null} selectedIds={photos.map((p) => p.id)} />
      ) : null}
    </>
  );
}
