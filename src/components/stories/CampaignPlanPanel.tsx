"use client";

import { useState } from "react";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { PlanPost, StoryPlan } from "@/types/story";

const EMPTY: StoryPlan = { goal: "", audience: "", key_messages: [], channels: [], timeline: "", ctas: [], hashtags: [], posts: [] };
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const commas = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/**
 * A campaign's plan: goal, audience, messages, channels, timeline, calls to action, hashtags and posts.
 * "Create Idea posts in the calendar" turns the posts into calendar items linked back to the campaign
 * (save the plan first).
 */
export function CampaignPlanPanel({
  storyId,
  plan,
  onChange,
  calendarCount,
  dirty,
  onCalendar,
}: {
  storyId: string;
  plan: StoryPlan | null;
  onChange: (p: StoryPlan) => void;
  calendarCount: number;
  dirty: boolean;
  onCalendar: () => void;
}) {
  const t = useT(storiesMessages);
  const p = plan ?? EMPTY;
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<StoryPlan>) => onChange({ ...p, ...patch });
  const setPost = (i: number, patch: Partial<PlanPost>) => set({ posts: p.posts.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">{t("plan")}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("goal")}</Label>
          <Input value={p.goal} onChange={(e) => set({ goal: e.target.value })} className="min-h-9" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("audience")}</Label>
          <Input value={p.audience} onChange={(e) => set({ audience: e.target.value })} className="min-h-9" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("timeline")}</Label>
          <Input value={p.timeline} onChange={(e) => set({ timeline: e.target.value })} className="min-h-9" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("channels")}</Label>
          <Input defaultValue={p.channels.join(", ")} onBlur={(e) => set({ channels: commas(e.target.value) })} className="min-h-9" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("messages")}</Label>
          <Textarea defaultValue={p.key_messages.join("\n")} onBlur={(e) => set({ key_messages: lines(e.target.value) })} rows={3} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("ctas")}</Label>
          <Textarea defaultValue={p.ctas.join("\n")} onBlur={(e) => set({ ctas: lines(e.target.value) })} rows={3} />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label className="text-xs">{t("hashtags")}</Label>
          <Input defaultValue={p.hashtags.join(" ")} onBlur={(e) => set({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })} className="min-h-9" />
        </div>
      </div>

      <h4 className="text-sm font-semibold">{t("posts")}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs">
            <tr>
              <th className="px-2 py-1">{t("postDate")}</th>
              <th className="px-2 py-1">{t("postTitle")}</th>
              <th className="px-2 py-1">{t("postPlatform")}</th>
              <th className="px-2 py-1">{t("postFormat")}</th>
              <th className="px-2 py-1">{t("postBrief")}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {p.posts.map((x, i) => (
              <tr key={i} className="border-t align-top">
                <td className="px-1 py-1">
                  <Input type="date" value={x.date ?? ""} onChange={(e) => setPost(i, { date: e.target.value || null })} className="h-8 w-36" aria-label={t("postDate")} />
                </td>
                <td className="px-1 py-1">
                  <Input value={x.title} onChange={(e) => setPost(i, { title: e.target.value })} className="h-8" aria-label={t("postTitle")} />
                </td>
                <td className="px-1 py-1">
                  <Input value={x.platform} onChange={(e) => setPost(i, { platform: e.target.value })} className="h-8 w-28" aria-label={t("postPlatform")} />
                </td>
                <td className="px-1 py-1">
                  <Input value={x.format} onChange={(e) => setPost(i, { format: e.target.value })} className="h-8 w-28" aria-label={t("postFormat")} />
                </td>
                <td className="px-1 py-1">
                  <Input value={x.brief} onChange={(e) => setPost(i, { brief: e.target.value })} className="h-8" aria-label={t("postBrief")} />
                </td>
                <td className="px-1 py-1">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => set({ posts: p.posts.filter((_, j) => j !== i) })} aria-label={t("remove")}>
                    <Trash2 aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="min-h-9"
          onClick={() => set({ posts: [...p.posts, { title: "", platform: "", format: "", pillar: "", brief: "", date: null, awareness_day: null }] })}
        >
          <Plus aria-hidden /> {t("addPost")}
        </Button>
        <Button
          size="sm"
          className="min-h-9"
          disabled={busy || dirty || !p.posts.length}
          title={dirty ? t("unsaved") : undefined}
          onClick={async () => {
            setBusy(true);
            try {
              const { created } = await requestJson<{ created: number }>(`/api/stories/${storyId}/calendar`, { method: "POST" });
              toast.success(t("calendarDone", { n: created }));
              onCalendar();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <CalendarPlus aria-hidden /> {t("toCalendar")}
        </Button>
        {calendarCount ? <span className="text-xs text-muted-foreground">{t("inCalendar", { n: calendarCount })}</span> : null}
      </div>
    </section>
  );
}
