"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useActivityTypes } from "@/components/layout/ActivityTypesProvider";
import { requestJson } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { activityTypesMessages } from "@/lib/i18n/messages/activityTypes";
import type { ActivityType } from "@/config/activity-types";

/** Saves, then reloads the list so this screen (and every picker in this tab) shows the change at once. */
function useRun() {
  const { refresh } = useActivityTypes();
  return async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      await refresh();
    }
  };
}

/** Enter saves a text box (by leaving it), like clicking elsewhere. */
const saveOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
};

function Row({ a, first, last, onMove }: { a: ActivityType; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  const t = useT(activityTypesMessages);
  const run = useRun();
  const [label, setLabel] = useState(a.label);
  const [labelHi, setLabelHi] = useState(a.labelHi === a.label ? "" : a.labelHi);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patch = (body: Record<string, unknown>) => run(() => requestJson(`/api/activity-types/${a.id}`, { method: "PATCH", body }));

  return (
    <li className={cn("flex flex-wrap items-center gap-1.5 border-b py-2 last:border-b-0", a.retired && "opacity-60")}>
      <Button variant="ghost" size="icon" className="size-9" disabled={first} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
        <ArrowUp aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" className="size-9" disabled={last} onClick={() => onMove(1)} aria-label={t("moveDown")}>
        <ArrowDown aria-hidden />
      </Button>
      <input
        type="color"
        aria-label={`${t("colour")}: ${a.label}`}
        defaultValue={a.color}
        onChange={(e) => {
          const color = e.target.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => patch({ color }), 600);
        }}
        className="size-9 cursor-pointer rounded border bg-transparent p-0.5"
      />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={saveOnEnter} onBlur={() => label.trim() && label !== a.label && patch({ label: label.trim() })} className="h-9 min-w-36 flex-1" aria-label={t("name")} />
      <Input
        value={labelHi}
        onChange={(e) => setLabelHi(e.target.value)}
        onKeyDown={saveOnEnter}
        onBlur={() => labelHi !== (a.labelHi === a.label ? "" : a.labelHi) && patch({ label_hi: labelHi.trim() || null })}
        placeholder={t("nameHi")}
        lang="hi"
        className="h-9 w-36"
        aria-label={t("nameHi")}
      />
      <code className="rounded bg-secondary px-1.5 py-0.5 text-xs" title={t("code")}>
        {a.id}
      </code>
      <Button variant="ghost" className="min-h-9 px-2" onClick={() => patch({ hidden: !a.retired })} aria-pressed={a.retired}>
        {a.retired ? <Eye aria-hidden /> : <EyeOff aria-hidden />} {a.retired ? t("show") : t("hide")}
      </Button>
      <Button variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => setDeleting(true)} aria-label={`${t("delete")}: ${a.label}`}>
        <Trash2 aria-hidden />
      </Button>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle", { name: a.label })}
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() => run(() => requestJson(`/api/activity-types/${a.id}`, { method: "DELETE" }), t("saved"))}
      />
    </li>
  );
}

/** Settings > Lists: add, rename, recolour, reorder, hide and delete activity types. */
export function ActivityTypesCard() {
  const t = useT(activityTypesMessages);
  const run = useRun();
  const { all } = useActivityTypes();
  const [draft, setDraft] = useState("");
  const [draftHi, setDraftHi] = useState("");
  const [draftColor, setDraftColor] = useState("#7A8AA3");

  function move(i: number, d: -1 | 1) {
    const ids = all.map((a) => a.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    void run(() => requestJson("/api/activity-types", { method: "PUT", body: { ids } }));
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <ul>
        {all.map((a, i) => (
          <Row key={`${a.id}:${a.label}:${a.labelHi}:${a.color}:${a.retired}`} a={a} first={i === 0} last={i === all.length - 1} onMove={(d) => move(i, d)} />
        ))}
      </ul>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const label = draft.trim();
          if (!label) return;
          const body = { label, label_hi: draftHi.trim() || null, color: draftColor };
          setDraft("");
          setDraftHi("");
          void run(() => requestJson("/api/activity-types", { method: "POST", body }), t("saved"));
        }}
      >
        <input
          type="color"
          value={draftColor}
          onChange={(e) => setDraftColor(e.target.value)}
          aria-label={t("colour")}
          className="size-10 cursor-pointer rounded border bg-transparent p-0.5"
        />
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("addPlaceholder")} aria-label={t("addPlaceholder")} className="min-h-10 min-w-48 flex-1" />
        <Input value={draftHi} onChange={(e) => setDraftHi(e.target.value)} placeholder={t("nameHi")} aria-label={t("nameHi")} lang="hi" className="min-h-10 w-40" />
        <Button type="submit" className="min-h-10" disabled={!draft.trim()}>
          {t("add")}
        </Button>
      </form>
    </section>
  );
}
