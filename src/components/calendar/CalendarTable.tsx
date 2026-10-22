"use client";

import { useState } from "react";
import { PanelRightOpen, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/calendar/OptionSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import { calendarDeleteMessages } from "@/lib/i18n/messages/calendar-delete";
import type { ContentItem } from "@/types/content";

type Patch = (id: string, fields: Partial<ContentItem>) => Promise<void>;

/** Text cell: shows the value; click to edit; saves on blur or Enter, Escape cancels. */
function TextCell({ value, label, onSave, wide }: { value: string | null; label: string; onSave: (v: string | null) => void; wide?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if ((draft || null) !== value) onSave(draft.trim() || null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        className="h-8 min-w-40"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={`block w-full truncate rounded px-1 py-1 text-left hover:bg-secondary ${wide ? "max-w-72" : "max-w-48"}`}
      title={value ?? ""}
      aria-label={`${label}: ${value ?? ""}`}
    >
      {value || <span className="text-muted-foreground">—</span>}
    </button>
  );
}

/** The 12-column calendar table with inline editing (click a cell). */
export function CalendarTable({ items, patch, onOpen, onChanged }: { items: ContentItem[]; patch: Patch; onOpen: (id: string) => void; onChanged: () => void }) {
  const t = useT(calendarMessages);
  const td_ = useT(calendarDeleteMessages);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [askOne, setAskOne] = useState<ContentItem | null>(null);
  const [askMany, setAskMany] = useState(false);
  // only posts still in this list count (a month change or a refresh drops the others)
  const chosen = items.filter((i) => selected.has(i.id));
  const allChosen = items.length > 0 && chosen.length === items.length;
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function remove(ids: string[], single: boolean) {
    try {
      const res = single
        ? await requestJson(`/api/content/${ids[0]}`, { method: "DELETE" }).then(() => ({ deleted: 1 }))
        : await requestJson<{ deleted: number }>("/api/content/bulk-delete", { method: "POST", body: { ids } });
      toast.success(single ? td_("deletedOne") : td_("deletedMany", { n: res.deleted }));
      setSelected((prev) => new Set([...prev].filter((x) => !ids.includes(x))));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }
  const save = (id: string, fields: Partial<ContentItem>) =>
    patch(id, fields).then(
      () => toast.success(t("saved")),
      (err: unknown) => toast.error(err instanceof Error ? err.message : String(err)),
    );

  if (!items.length) return <EmptyState title={t("empty")} body={t("emptyBody")} />;
  const th = "border-b bg-secondary px-3 py-2 text-left text-xs font-semibold whitespace-nowrap";
  const td = "border-b px-2 py-1 align-middle text-sm";
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      {chosen.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-secondary px-3 py-2" role="status">
          <span className="text-sm font-medium">{td_("selected", { n: chosen.length })}</span>
          <Button variant="destructive" size="sm" className="min-h-9" onClick={() => setAskMany(true)}>
            <Trash2 aria-hidden /> {td_("deleteSelected")}
          </Button>
          <Button variant="ghost" size="sm" className="min-h-9" onClick={() => setSelected(new Set())}>
            <X aria-hidden /> {td_("clear")}
          </Button>
        </div>
      ) : null}
      <table className="w-full min-w-[1780px] border-collapse">
        <thead>
          <tr>
            <th className={`${th} sticky left-0 z-10 w-10 min-w-10`}>
              <Checkbox
                aria-label={td_("selectAll")}
                checked={allChosen ? true : chosen.length ? "indeterminate" : false}
                onCheckedChange={(c) => setSelected(c === true ? new Set(items.map((i) => i.id)) : new Set())}
              />
            </th>
            <th className={`${th} sticky left-10 z-10`}>{t("publish_date")}</th>
            <th className={th}>{t("platform")}</th>
            <th className={th}>{t("content_format")}</th>
            <th className={th}>{t("content_pillar")}</th>
            <th className={th}>{t("title_col")}</th>
            <th className={th}>{t("content_brief")}</th>
            <th className={th}>{t("caption")}</th>
            <th className={th}>{t("hashtags")}</th>
            <th className={th}>{t("cta")}</th>
            <th className={th}>{t("goal")}</th>
            <th className={th}>{t("status")}</th>
            <th className={th}>{t("production_stage")}</th>
            <th className={th}>
              <span className="sr-only">{t("editTitle")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className={selected.has(i.id) ? "bg-secondary/60" : "hover:bg-secondary/40"}>
              <td className={`${td} sticky left-0 z-10 w-10 min-w-10 bg-card`}>
                <Checkbox
                  aria-label={td_("selectRow", { title: i.title ?? td_("untitled") })}
                  checked={selected.has(i.id)}
                  onCheckedChange={(c) => toggle(i.id, c === true)}
                />
              </td>
              <td className={`${td} sticky left-10 z-10 bg-card`}>
                <Input
                  type="date"
                  aria-label={`${t("publish_date")}: ${i.title ?? ""}`}
                  defaultValue={i.publish_date ?? ""}
                  onBlur={(e) => (e.target.value || null) !== i.publish_date && save(i.id, { publish_date: e.target.value || null })}
                  className="h-8 w-36 border-transparent bg-transparent hover:border-input"
                />
              </td>
              <td className={td}>
                <OptionSelect compact type="platform" value={i.platform} onChange={(v) => save(i.id, { platform: v })} label={t("platform")} />
              </td>
              <td className={td}>
                <OptionSelect compact type="format" value={i.content_format} onChange={(v) => save(i.id, { content_format: v })} label={t("content_format")} />
              </td>
              <td className={td}>
                <OptionSelect compact type="pillar" value={i.content_pillar} onChange={(v) => save(i.id, { content_pillar: v })} label={t("content_pillar")} />
              </td>
              <td className={`${td} font-semibold`}>
                <TextCell value={i.title} label={t("title_col")} onSave={(v) => (v ? save(i.id, { title: v }) : toast.error(t("titleRequired")))} wide />
              </td>
              <td className={td}>
                <TextCell value={i.content_brief} label={t("content_brief")} onSave={(v) => save(i.id, { content_brief: v })} />
              </td>
              <td className={td}>
                <TextCell value={i.caption} label={t("caption")} onSave={(v) => save(i.id, { caption: v })} />
              </td>
              <td className={td}>
                <TextCell value={i.hashtags} label={t("hashtags")} onSave={(v) => save(i.id, { hashtags: v })} />
              </td>
              <td className={td}>
                <TextCell value={i.cta} label={t("cta")} onSave={(v) => save(i.id, { cta: v })} />
              </td>
              <td className={td}>
                <OptionSelect compact type="goal" value={i.goal} onChange={(v) => save(i.id, { goal: v })} label={t("goal")} />
              </td>
              <td className={td}>
                <OptionSelect compact type="status" allowNone={false} value={i.status} onChange={(v) => v && save(i.id, { status: v })} label={t("status")} />
              </td>
              <td className={td}>
                <OptionSelect compact type="stage" allowNone={false} value={i.production_stage} onChange={(v) => v && save(i.id, { production_stage: v })} label={t("production_stage")} />
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <Button variant="ghost" size="sm" className="min-h-8 gap-1" onClick={() => onOpen(i.id)} aria-label={`${t("editTitle")}: ${i.title ?? ""}`}>
                  {i.first_thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- cached thumbnail
                    <img src={i.first_thumb} alt="" className="size-7 rounded object-cover" />
                  ) : null}
                  {i.photo_count ? <span className="text-xs text-muted-foreground">{i.photo_count}</span> : null}
                  <PanelRightOpen aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setAskOne(i)}
                  aria-label={td_("deleteRow", { title: i.title ?? td_("untitled") })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={askOne !== null}
        onOpenChange={(o) => !o && setAskOne(null)}
        title={td_("oneTitle")}
        body={td_("oneBody", { title: askOne?.title ?? td_("untitled") })}
        confirmLabel={td_("confirmOne")}
        destructive
        onConfirm={() => (askOne ? remove([askOne.id], true) : undefined)}
      />
      <ConfirmDialog
        open={askMany}
        onOpenChange={setAskMany}
        title={td_("bulkTitle", { n: chosen.length })}
        body={td_("bulkBody")}
        confirmLabel={td_("confirmBulk", { n: chosen.length })}
        destructive
        onConfirm={() => remove(chosen.map((c) => c.id), false)}
      />
    </div>
  );
}
