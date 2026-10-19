"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiAssistPanel } from "@/components/calendar/AiAssistPanel";
import { ConsentWarnings, needsWarning } from "@/components/calendar/ConsentWarnings";
import { OptionSelect } from "@/components/calendar/OptionSelect";
import { PhotoStrip } from "@/components/calendar/PhotoStrip";
import { ReportContext } from "@/components/calendar/ReportContext";
import { activityLabel } from "@/config/activity-types";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { useLocale, useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import type { ContentItem, PhotosInfo } from "@/types/content";

export type ItemDraft = Pick<
  ContentItem,
  "publish_date" | "platform" | "content_format" | "content_pillar" | "title" | "content_brief" | "caption" | "hashtags" | "cta" | "goal" | "status" | "production_stage" | "awareness_day"
>;

export type NewItemInitial = { date?: string | null; dayKey?: string | null; dayName?: string | null; title?: string | null; photoIds?: string[] };

/** The editable fields of a post (used by New item and the item panel). */
export function ItemFields({
  value,
  onChange,
  titleError,
  titleRef,
  titleHint,
  dayName,
}: {
  value: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  titleError?: string;
  titleRef?: React.Ref<HTMLInputElement>;
  titleHint?: string;
  dayName?: string | null;
}) {
  const t = useT(calendarMessages);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-title">{t("titleLabel")}</Label>
        <Input
          id="item-title"
          ref={titleRef}
          value={value.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="min-h-10"
          maxLength={200}
          aria-invalid={!!titleError || undefined}
          aria-describedby="item-title-hint"
        />
        <p id="item-title-hint" className={titleError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {titleError ?? titleHint ?? ""}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-date">{t("dateLabel")}</Label>
          <Input id="item-date" type="date" value={value.publish_date ?? ""} onChange={(e) => onChange({ publish_date: e.target.value || null })} className="min-h-10" />
          {dayName ? (
            <p className="text-xs text-muted-foreground">
              {t("dayLabel")}: <b>{dayName}</b>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-platform">{t("platform")}</Label>
          <OptionSelect id="item-platform" type="platform" value={value.platform} onChange={(v) => onChange({ platform: v })} label={t("platform")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-format">{t("content_format")}</Label>
          <OptionSelect id="item-format" type="format" value={value.content_format} onChange={(v) => onChange({ content_format: v })} label={t("content_format")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-pillar">{t("content_pillar")}</Label>
          <OptionSelect id="item-pillar" type="pillar" value={value.content_pillar} onChange={(v) => onChange({ content_pillar: v })} label={t("content_pillar")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-goal">{t("goal")}</Label>
          <OptionSelect id="item-goal" type="goal" value={value.goal} onChange={(v) => onChange({ goal: v })} label={t("goal")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-status">{t("status")}</Label>
          <OptionSelect id="item-status" type="status" value={value.status} onChange={(v) => v && onChange({ status: v })} label={t("status")} allowNone={false} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="item-stage">{t("production_stage")}</Label>
          <OptionSelect id="item-stage" type="stage" value={value.production_stage} onChange={(v) => v && onChange({ production_stage: v })} label={t("production_stage")} allowNone={false} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-cta">{t("ctaLabel")}</Label>
        <Input id="item-cta" value={value.cta ?? ""} onChange={(e) => onChange({ cta: e.target.value })} className="min-h-10" maxLength={300} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-brief">{t("briefLabel")}</Label>
        <Textarea id="item-brief" value={value.content_brief ?? ""} onChange={(e) => onChange({ content_brief: e.target.value })} rows={3} maxLength={4000} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-caption">{t("captionLabel")}</Label>
        <Textarea id="item-caption" value={value.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} rows={5} maxLength={5000} aria-describedby="item-caption-count" />
        <p id="item-caption-count" className="text-right text-xs text-muted-foreground">
          {t("chars", { n: (value.caption ?? "").length })}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-tags">{t("hashtagsLabel")}</Label>
        <Input id="item-tags" value={value.hashtags ?? ""} onChange={(e) => onChange({ hashtags: e.target.value })} className="min-h-10" maxLength={1000} />
      </div>
    </div>
  );
}

/** Photo info and reports for photos that are not saved to a post yet. */
export function usePhotosInfo(ids: string[]) {
  return useQuery({
    queryKey: ["photos-info", ids.join(",")],
    queryFn: () => requestJson<PhotosInfo>(`/api/content/new/photos?ids=${ids.join(",")}`),
    enabled: ids.length > 0,
  });
}

/**
 * New calendar item. Opened from the toolbar, a day ("Plan a post"), or the gallery's
 * "Add to calendar" with photos attached (their reports are shown, a title is suggested).
 */
export function NewItemDialog({
  open,
  onOpenChange,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: NewItemInitial;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
        {open ? <Body initial={initial} onOpenChange={onOpenChange} onCreated={onCreated} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({ initial, onOpenChange, onCreated }: { initial: NewItemInitial; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const t = useT(calendarMessages);
  const locale = useLocale();
  const { options: statuses } = useOptions("status");
  const { options: stages } = useOptions("stage");
  const titleRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ItemDraft>({
    publish_date: initial.date ?? null,
    platform: null,
    content_format: null,
    content_pillar: null,
    title: initial.title ?? null,
    content_brief: null,
    caption: null,
    hashtags: null,
    cta: null,
    goal: null,
    status: "",
    production_stage: "",
    awareness_day: initial.dayKey ?? null,
  });
  const [photoIds, setPhotoIds] = useState<string[]>(initial.photoIds ?? []);
  const [confirmed, setConfirmed] = useState(false);
  const [titleError, setTitleError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const info = usePhotosInfo(photoIds);
  const photos = (info.data?.photos ?? []).filter((p) => photoIds.includes(p.id));

  // Suggested title from the first photo ("Training in Village 1") until the admin types one.
  const first = photos[0];
  const suggestion = first ? [activityLabel(first.activity_type, locale), first.village_name].filter(Boolean).join(locale === "hi" ? " · " : " in ") : "";
  const shown: ItemDraft = {
    ...draft,
    title: draft.title ?? suggestion,
    status: draft.status || statuses[0]?.value || "Idea",
    production_stage: draft.production_stage || stages[0]?.value || "Not started",
  };

  async function save(asIdea: boolean) {
    if (!shown.title?.trim()) {
      setTitleError(t("titleRequired"));
      titleRef.current?.focus();
      return;
    }
    if (photos.some(needsWarning) && !confirmed) {
      toast.error(t("warnMustConfirm"));
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...shown,
        title: shown.title.trim(),
        ...(asIdea ? { status: statuses[0]?.value ?? "Idea", production_stage: stages[0]?.value ?? "Not started" } : {}),
        photo_ids: photoIds,
      };
      await requestJson("/api/content", { method: "POST", body });
      toast.success(t("created"));
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("newTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("newTitle")}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <ItemFields
          value={shown}
          onChange={(patch) => {
            if ("title" in patch) setTitleError(undefined);
            setDraft((d) => ({ ...d, ...patch }));
          }}
          titleError={titleError}
          titleRef={titleRef}
          titleHint={draft.title === null && suggestion ? t("titleSuggested") : undefined}
          dayName={initial.dayName}
        />
        <div className="flex flex-col gap-4">
          <PhotoStrip photos={photos} onRemove={(id) => setPhotoIds((ids) => ids.filter((x) => x !== id))} onAdd={(ids) => setPhotoIds((cur) => [...new Set([...cur, ...ids])])} />
          <ConsentWarnings photos={photos} confirmed={confirmed} onConfirm={setConfirmed} onRemove={(id) => setPhotoIds((ids) => ids.filter((x) => x !== id))} />
          <ReportContext reports={info.data?.reports ?? []} />
          <AiAssistPanel
            photoIds={photoIds}
            title={shown.title ?? ""}
            platform={shown.platform}
            format={shown.content_format}
            goal={shown.goal}
            onUse={(field, text) => setDraft((d) => ({ ...d, [field]: text }))}
            onPickDay={(day) => setDraft((d) => ({ ...d, publish_date: day.date, title: d.title ?? `${day.name}: ${suggestion}` }))}
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button variant="outline" className="min-h-11" onClick={() => save(true)} disabled={busy}>
          {t("saveIdea")}
        </Button>
        <Button className="min-h-11" onClick={() => save(false)} disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
