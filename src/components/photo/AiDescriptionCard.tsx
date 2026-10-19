"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { photoMessages } from "@/lib/i18n/messages/photo";
import { commonMessages } from "@/lib/i18n/messages/common";
import type { PhotoDetail } from "@/types/photo-detail";

/**
 * The photo's description and tags (AI, phase 8). Free tier: only photos with consent "yes" and no
 * children are sent, so others have none and the admin can type one.
 */
export function AiDescriptionCard({ detail, onChanged }: { detail: PhotoDetail; onChanged: () => void }) {
  const t = useT(photoMessages);
  const tc = useT(commonMessages);
  const p = detail.photo;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.ai_description ?? "");
  const [busy, setBusy] = useState(false);
  const notSent = p.consent !== "yes" || p.has_children;

  async function save() {
    setBusy(true);
    try {
      await requestJson(`/api/photos/${p.id}`, { method: "PATCH", body: { ai_description: text.trim() || null } });
      toast.success(t("saved"));
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{t("aiDescription")}</h2>
      {editing ? (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} aria-label={t("typeDescription")} />
          <div className="flex gap-2">
            <Button className="min-h-10" onClick={save} disabled={busy}>
              {t("save")}
            </Button>
            <Button variant="outline" className="min-h-10" onClick={() => setEditing(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
          </div>
        </>
      ) : p.ai_description ? (
        <p>{p.ai_description}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{notSent ? t("noDescriptionConsent") : t("noDescription")}</p>
      )}
      {p.ai_tags?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {p.ai_tags.map((tag) => (
            <li key={tag} className="rounded-full border bg-secondary px-2.5 py-0.5 text-xs">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {p.ai_quality ? (
        <p className="text-sm text-muted-foreground">
          {t("quality", { n: p.ai_quality })}
          {p.ai_suitable_for_social !== null ? ` · ${p.ai_suitable_for_social ? t("goodForSocial") : t("notForSocial")}` : ""}
        </p>
      ) : null}
      {!editing ? (
        <Button variant="outline" size="sm" className="min-h-9 self-start" onClick={() => setEditing(true)}>
          {t("typeDescription")}
        </Button>
      ) : null}
    </section>
  );
}
