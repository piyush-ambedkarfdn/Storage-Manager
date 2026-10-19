"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import { commonMessages } from "@/lib/i18n/messages/common";
import { STORY_KINDS, type Story, type StoryKind } from "@/types/story";

/**
 * mode "create": a new story or campaign (kind + title), then the editor opens.
 * mode "draft": AI writes the draft from the linked reports (language and tone).
 */
export function GenerateDialog({
  mode,
  open,
  onOpenChange,
  storyId,
  defaultKind = "impact_story",
  onDrafted,
}: {
  mode: "create" | "draft";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storyId?: string;
  defaultKind?: StoryKind;
  onDrafted?: (s: Story) => void;
}) {
  const t = useT(storiesMessages);
  const tc = useT(commonMessages);
  const router = useRouter();
  const [kind, setKind] = useState<StoryKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [tone, setTone] = useState<"warm" | "formal" | "simple">("warm");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      if (mode === "create") {
        const { story } = await requestJson<{ story: Story }>("/api/stories", { method: "POST", body: { kind, title } });
        onOpenChange(false);
        router.push(`/admin/stories/${story.id}`);
      } else {
        const { story } = await requestJson<{ story: Story }>("/api/ai/story-draft", { method: "POST", body: { storyId, language, tone } });
        toast.success(t("drafted"));
        onDrafted?.(story);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("aiDraft")}</DialogTitle>
          <DialogDescription>{mode === "draft" ? t("notReviewed") : t("subtitle")}</DialogDescription>
        </DialogHeader>
        {mode === "create" ? (
          <div className="flex flex-col gap-3">
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">{t("kind")}</legend>
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as StoryKind)}>
                {STORY_KINDS.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={k} /> {t(`kind_${k}`)}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-story-title">{t("storyTitle")}</Label>
              <Input id="new-story-title" value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-10" maxLength={200} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">{t("language")}</legend>
              <RadioGroup value={language} onValueChange={(v) => setLanguage(v as "en" | "hi")} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="en" /> English
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="hi" /> हिंदी
                </label>
              </RadioGroup>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">{t("tone")}</legend>
              <RadioGroup value={tone} onValueChange={(v) => setTone(v as typeof tone)} className="flex flex-wrap gap-4">
                {(["warm", "formal", "simple"] as const).map((x) => (
                  <label key={x} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={x} /> {t(`tone_${x}`)}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
            {tc("cancel")}
          </Button>
          <Button className="min-h-11" onClick={go} disabled={busy || (mode === "create" && !title.trim())}>
            {busy ? (mode === "draft" ? t("drafting") : tc("loading")) : mode === "create" ? t("create") : t("aiDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
