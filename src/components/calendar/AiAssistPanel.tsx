"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isEnabled } from "@/config/features";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";

export type AiDay = { name: string; date: string; scope: string; why: string; angle: string; needsDateCheck: boolean };

/**
 * AI writing help for a post (shown only once phase 8 switches features.ai on). Captions are written
 * from the field reports of the attached photos. Nothing is saved until the admin presses Use.
 */
export function AiAssistPanel({
  photoIds,
  title,
  platform,
  format,
  goal,
  onUse,
  onPickDay,
}: {
  photoIds: string[];
  title: string;
  platform: string | null;
  format: string | null;
  goal: string | null;
  onUse: (field: "caption" | "content_brief" | "hashtags" | "cta", text: string) => void;
  onPickDay?: (day: AiDay) => void;
}) {
  const t = useT(calendarMessages);
  const [busy, setBusy] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [days, setDays] = useState<AiDay[]>([]);
  if (!isEnabled("ai")) return null;

  async function call<T>(name: string, url: string, body: unknown): Promise<T | null> {
    setBusy(name);
    try {
      return await requestJson<T>(url, { method: "POST", body });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(null);
    }
  }
  const ctx = { photoIds, title, platform, format, goal };

  return (
    <section className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4" aria-hidden /> {t("aiTitle")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("aiFree")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!!busy || !photoIds.length} onClick={async () => setCaptions((await call<{ captions: string[] }>("caption", "/api/ai/caption", ctx))?.captions ?? captions)}>
          {busy === "caption" ? t("aiWorking") : t("aiCaption")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!busy || !title} onClick={async () => { const r = await call<{ brief: string }>("brief", "/api/ai/brief", ctx); if (r) onUse("content_brief", r.brief); }}>
          {busy === "brief" ? t("aiWorking") : t("aiBrief")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!busy || !title} onClick={async () => { const r = await call<{ hashtags: string }>("hashtags", "/api/ai/hashtags", ctx); if (r) onUse("hashtags", r.hashtags); }}>
          {busy === "hashtags" ? t("aiWorking") : t("aiHashtags")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!busy || !title} onClick={async () => { const r = await call<{ cta: string[] }>("cta", "/api/ai/cta", ctx); if (r?.cta[0]) onUse("cta", r.cta[0]); }}>
          {busy === "cta" ? t("aiWorking") : t("aiCta")}
        </Button>
        {onPickDay ? (
          <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={async () => setDays((await call<{ days: AiDay[] }>("days", "/api/ai/days", { photoIds, title }))?.days ?? days)}>
            {busy === "days" ? t("aiWorking") : t("aiDays")}
          </Button>
        ) : null}
      </div>
      {captions.map((c, i) => (
        <div key={i} className="rounded border bg-card p-2 text-sm">
          <p className="whitespace-pre-line">{c}</p>
          <Button type="button" size="sm" variant="link" className="h-auto px-0" onClick={() => onUse("caption", c)}>
            {t("aiUse")}
          </Button>
        </div>
      ))}
      {days.length ? (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-semibold">{t("aiDaysTitle")}</h4>
          {days.map((d) => (
            <div key={`${d.name}${d.date}`} className="rounded border bg-card p-2 text-sm">
              <b>{d.date}</b> {d.name} {d.needsDateCheck ? <span className="text-xs text-marigold-ink">({t("aiCheckDate")})</span> : null}
              <p className="text-xs text-muted-foreground">{d.why} · {d.angle}</p>
              <Button type="button" size="sm" variant="link" className="h-auto px-0" onClick={() => onPickDay?.(d)}>
                {t("aiUse")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
