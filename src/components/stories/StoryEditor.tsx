"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ColorChip } from "@/components/shared/ColorChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CampaignPlanPanel } from "@/components/stories/CampaignPlanPanel";
import { ConsentBlockers } from "@/components/stories/ConsentBlockers";
import { ExportMenu } from "@/components/stories/ExportMenu";
import { GenerateDialog } from "@/components/stories/GenerateDialog";
import { MarkdownPreview } from "@/components/stories/MarkdownPreview";
import { STATUS_COLOR } from "@/components/stories/StoryCard";
import { SourceReportsPicker } from "@/components/stories/SourceReportsPicker";
import { StoryPhotoPicker } from "@/components/stories/StoryPhotoPicker";
import { isEnabled } from "@/config/features";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { readyProblems } from "@/lib/stories/blockers";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import { STORY_STATUSES, type Story, type StoryDetail, type StoryStatus } from "@/types/story";

type Edits = Partial<Pick<Story, "title" | "summary" | "body_md" | "language" | "theme_ids" | "plan" | "published_url">>;

/** The story editor: text with preview, AI draft and changes, sources, photos, checks, plan, export, status. */
export function StoryEditor({ initial }: { initial: StoryDetail }) {
  const t = useT(storiesMessages);
  const router = useRouter();
  const qc = useQueryClient();
  const id = initial.story.id;
  const { data: detail } = useQuery({
    queryKey: ["story", id],
    queryFn: () => requestJson<StoryDetail>(`/api/stories/${id}`),
    initialData: initial,
  });
  const { allOptions: themes } = useOptions("theme");
  const [edits, setEdits] = useState<Edits>({});
  const [busy, setBusy] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [refine, setRefine] = useState("");
  const [deleting, setDeleting] = useState(false);

  const story: Story = { ...detail.story, ...edits };
  const dirty = Object.keys(edits).length > 0;
  const problems = readyProblems(detail.story, detail.blockers);
  const refresh = () => qc.invalidateQueries({ queryKey: ["story", id] });

  async function patch(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    try {
      await requestJson(`/api/stories/${id}`, { method: "PATCH", body });
      if (ok) toast.success(ok);
      await refresh();
      void qc.invalidateQueries({ queryKey: ["stories"] });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (await patch(edits, t("saved"))) setEdits({});
  }

  async function setPhotos(ids: string[]) {
    try {
      await requestJson(`/api/stories/${id}/photos`, { method: "PUT", body: { photo_ids: ids } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function runRefine(instruction: string) {
    if (dirty && !(await patch(edits))) return;
    setEdits({});
    setBusy(true);
    try {
      await requestJson(`/api/ai/story-refine`, { method: "POST", body: { storyId: id, instruction } });
      toast.success(t("drafted"));
      setRefine("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/stories?tab=${story.kind}`} className={buttonVariants({ variant: "outline", className: "min-h-10" })}>
          <ArrowLeft aria-hidden /> {t("back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ColorChip color="var(--primary)" label={t(`kind_${story.kind}`)} />
          {story.ai_generated ? (
            story.reviewed_at ? (
              <span className="text-xs text-success">{t("reviewedBy", { name: detail.reviewer_name ?? "" })}</span>
            ) : (
              <span className="text-xs text-marigold-ink">{t("aiWritten")}</span>
            )
          ) : null}
          <ExportMenu story={detail.story} photos={detail.photos} previewId={`preview-${id}`} />
          <Button className="min-h-10" onClick={save} disabled={busy || !dirty}>
            {busy ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3">
          <Input value={story.title} onChange={(e) => setEdits({ ...edits, title: e.target.value })} className="min-h-12 text-xl font-bold" aria-label={t("storyTitle")} maxLength={200} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="story-summary" className="text-xs">
              {t("summary")}
            </Label>
            <Textarea id="story-summary" value={story.summary ?? ""} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} rows={2} />
          </div>

          {isEnabled("ai") ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
              <Button size="sm" className="min-h-9" onClick={() => setDraftOpen(true)} disabled={busy}>
                <Sparkles aria-hidden /> {t("aiDraft")}
              </Button>
              <Input value={refine} onChange={(e) => setRefine(e.target.value)} placeholder={t("refinePlaceholder")} className="h-9 min-w-48 flex-1" aria-label={t("aiRefine")} />
              <Button size="sm" variant="outline" className="min-h-9" onClick={() => runRefine(refine)} disabled={busy || refine.trim().length < 3}>
                {t("aiRefine")}
              </Button>
              {(["refineQuick1", "refineQuick2", "refineQuick3"] as const).map((k) => (
                <Button key={k} size="sm" variant="ghost" className="min-h-8 text-xs" onClick={() => runRefine(t(k))} disabled={busy || !story.body_md.trim()}>
                  {t(k)}
                </Button>
              ))}
            </div>
          ) : null}

          <Tabs defaultValue={story.body_md ? "preview" : "write"}>
            <TabsList>
              <TabsTrigger value="write">{t("write")}</TabsTrigger>
              <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
            </TabsList>
            <TabsContent value="write" forceMount className="data-[state=inactive]:hidden">
              <Textarea
                value={story.body_md}
                onChange={(e) => setEdits({ ...edits, body_md: e.target.value })}
                rows={22}
                className="font-mono text-sm"
                placeholder={t("bodyPlaceholder")}
                aria-label={t("write")}
                lang={story.language}
              />
            </TabsContent>
            <TabsContent value="preview" forceMount className="data-[state=inactive]:hidden">
              <div className="rounded-md border bg-card p-4" lang={story.language}>
                <MarkdownPreview id={`preview-${id}`} markdown={story.body_md} />
              </div>
            </TabsContent>
          </Tabs>

          {story.kind === "campaign" ? (
            <CampaignPlanPanel storyId={id} plan={story.plan} onChange={(plan) => setEdits({ ...edits, plan })} calendarCount={detail.calendar_count} dirty={"plan" in edits} onCalendar={refresh} />
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border bg-card p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("status")}</Label>
                <Select value={detail.story.status} onValueChange={(v) => patch({ status: v as StoryStatus }, t("saved"))}>
                  <SelectTrigger className="min-h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} disabled={(s === "ready" || s === "published") && problems.length > 0}>
                        <ColorChip color={STATUS_COLOR[s]} label={t(`status_${s}`)} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("language")}</Label>
                <Select value={story.language} onValueChange={(v) => setEdits({ ...edits, language: v as "en" | "hi" })}>
                  <SelectTrigger className="min-h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {problems.length ? (
              <div role="status" className="rounded-md border border-marigold bg-marigold/10 p-2 text-sm">
                {t("readyBlocked")} {problems.map((p) => t(`block_${p}`)).join("; ")}.
              </div>
            ) : null}
            {detail.story.ai_generated && !detail.story.reviewed_at ? (
              <div className="flex flex-col gap-2 rounded-md border p-2 text-sm">
                <p>{t("notReviewed")}</p>
                <Button size="sm" variant="outline" className="min-h-9 self-start" disabled={busy || dirty} onClick={() => patch({ reviewed: true }, t("reviewed"))}>
                  <CheckCircle2 aria-hidden /> {t("markReviewed")}
                </Button>
              </div>
            ) : null}
            {detail.story.reviewed_at ? (
              <p className="text-xs text-muted-foreground">
                {t("reviewedBy", { name: detail.reviewer_name ?? "" })} · {format(new Date(detail.story.reviewed_at), "d MMM yyyy")}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              <Label htmlFor="story-url" className="text-xs">
                {t("publishedUrl")}
              </Label>
              <Input id="story-url" type="url" value={story.published_url ?? ""} onChange={(e) => setEdits({ ...edits, published_url: e.target.value })} className="min-h-9" />
            </div>
          </section>

          <ConsentBlockers blockers={detail.blockers} photos={detail.photos} onRemove={(pid) => setPhotos(detail.photos.map((p) => p.id).filter((x) => x !== pid))} />
          <StoryPhotoPicker photos={detail.photos} reportIds={detail.story.source_report_ids} onChange={setPhotos} />
          <SourceReportsPicker reports={detail.reports} ids={detail.story.source_report_ids} onChange={(ids) => patch({ source_report_ids: ids })} />

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("themes")}</h3>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((o) => {
                const on = story.theme_ids.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setEdits({ ...edits, theme_ids: on ? story.theme_ids.filter((x) => x !== o.id) : [...story.theme_ids, o.id] })}
                    className={cn("min-h-8 rounded-full border px-3 text-xs font-semibold", on ? "border-marigold-ink bg-marigold/15" : "bg-card")}
                  >
                    {o.value}
                  </button>
                );
              })}
            </div>
          </section>

          <Button variant="ghost" className="min-h-10 self-start text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 aria-hidden /> {t("deleteStory")}
          </Button>
        </aside>
      </div>

      {draftOpen ? (
        <GenerateDialog
          mode="draft"
          open
          onOpenChange={setDraftOpen}
          storyId={id}
          onDrafted={() => {
            setEdits({});
            void refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={t("deleteStory")}
        destructive
        onConfirm={async () => {
          try {
            await requestJson(`/api/stories/${id}`, { method: "DELETE" });
            toast.success(t("deleted"));
            void qc.invalidateQueries({ queryKey: ["stories"] });
            router.push(`/admin/stories?tab=${story.kind}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </div>
  );
}
