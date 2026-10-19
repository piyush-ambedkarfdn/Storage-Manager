"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { requestJson, useInvalidateOptions, useOptions } from "@/hooks/useOptions";
import { COLORED_TYPES, OPTION_TYPES, type OptionItem, type OptionType } from "@/types/options";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";

type ListType = OptionType | "program";
const ALL_LISTS: readonly ListType[] = [...OPTION_TYPES, "program"];
const DEFAULT_COLOR = "#7A8AA3";

const base = (type: ListType) => (type === "program" ? "/api/programs" : "/api/options");

function useEditor(type: ListType) {
  const invalidate = useInvalidateOptions();
  const t = useT(settingsMessages);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      await invalidate(type);
    }
  }
  return {
    add: (value: string) =>
      run(() =>
        requestJson(base(type), {
          method: "POST",
          body: type === "program" ? { name: value } : { type, value, color: COLORED_TYPES.includes(type as OptionType) ? DEFAULT_COLOR : null },
        }),
      ),
    patch: (id: string, body: Record<string, unknown>) =>
      run(() =>
        requestJson(`${base(type)}/${id}`, {
          method: "PATCH",
          body: type === "program" && "value" in body ? { name: body.value } : body,
        }),
      ),
    remove: (id: string) => run(() => requestJson(`${base(type)}/${id}`, { method: "DELETE" }), t("saved")),
    reorder: (ids: string[]) => run(() => requestJson(base(type), { method: "PUT", body: { type, ids } })),
  };
}

function OptionRow({
  item,
  type,
  first,
  last,
  onMove,
  editor,
}: {
  item: OptionItem;
  type: ListType;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  editor: ReturnType<typeof useEditor>;
}) {
  const t = useT(settingsMessages);
  const [value, setValue] = useState(item.value);
  const [confirm, setConfirm] = useState(false);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colored = COLORED_TYPES.includes(type as OptionType);

  function commitName() {
    const v = value.trim();
    if (!v) setValue(item.value);
    else if (v !== item.value) editor.patch(item.id, { value: v });
  }

  return (
    <li className={cn("flex flex-wrap items-center gap-2 border-b py-2 last:border-b-0", item.hidden && "opacity-60")}>
      <div className="flex">
        <Button variant="ghost" size="icon" className="size-9" disabled={first} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
          <ArrowUp aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="size-9" disabled={last} onClick={() => onMove(1)} aria-label={t("moveDown")}>
          <ArrowDown aria-hidden />
        </Button>
      </div>
      {colored ? (
        <input
          type="color"
          aria-label={`${t("colour")}: ${item.value}`}
          defaultValue={item.color ?? DEFAULT_COLOR}
          onChange={(e) => {
            const color = e.target.value;
            if (colorTimer.current) clearTimeout(colorTimer.current);
            // the picker fires while dragging; save once it settles
            colorTimer.current = setTimeout(() => {
              if (color.toLowerCase() !== (item.color ?? "").toLowerCase()) editor.patch(item.id, { color });
            }, 600);
          }}
          className="size-9 cursor-pointer rounded border bg-transparent p-0.5"
        />
      ) : null}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        aria-label={t("optionValue")}
        className="min-h-9 min-w-40 flex-1"
      />
      {item.slug ? (
        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs" title={t("slug")}>
          {item.slug}
        </code>
      ) : null}
      {type === "status" ? (
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={item.protects_photos} onCheckedChange={(c) => editor.patch(item.id, { protects_photos: c })} />
          {t("protects")}
        </label>
      ) : null}
      <Button
        variant="ghost"
        className="min-h-9 px-2"
        onClick={() => editor.patch(item.id, { hidden: !item.hidden })}
        aria-pressed={item.hidden}
      >
        {item.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
        {item.hidden ? t("show") : t("hide")}
      </Button>
      <Button variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => setConfirm(true)} aria-label={`${t("delete")}: ${item.value}`}>
        <Trash2 aria-hidden />
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("deleteOptionTitle", { value: item.value })}
        body={t("deleteOptionBody")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() => editor.remove(item.id)}
      />
    </li>
  );
}

function ListEditor({ type }: { type: ListType }) {
  const t = useT(settingsMessages);
  const { allOptions, isLoading } = useOptions(type);
  const editor = useEditor(type);
  const [draft, setDraft] = useState("");
  const hint: SettingsKey | null = type === "theme" ? "themeHint" : type === "status" ? "statusHint" : type === "program" ? "programHint" : null;

  function move(index: number, dir: -1 | 1) {
    const ids = allOptions.map((o) => o.id);
    const j = index + dir;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    editor.reorder(ids);
  }

  return (
    <div className="flex flex-col gap-2">
      {hint ? <p className="text-sm text-muted-foreground">{t(hint)}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">…</p> : null}
      <ul>
        {allOptions.map((o, i) => (
          <OptionRow
            key={`${o.id}:${o.value}:${o.color}:${o.hidden}:${o.protects_photos}`}
            item={o}
            type={type}
            first={i === 0}
            last={i === allOptions.length - 1}
            onMove={(dir) => move(i, dir)}
            editor={editor}
          />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          editor.add(v);
          setDraft("");
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("addOption")} aria-label={t("addOption")} className="min-h-10 flex-1" />
        <Button type="submit" className="min-h-10" disabled={!draft.trim()}>
          {t("add")}
        </Button>
      </form>
    </div>
  );
}

/**
 * Admin-only editor for every dropdown list (and programs). Opened from Settings and from the
 * "Edit list" button beside dropdowns in later phases. Changes show everywhere at once.
 */
export function ManageOptionsDialog({
  type,
  open,
  onOpenChange,
}: {
  type: ListType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT(settingsMessages);
  const [tab, setTab] = useState<ListType>(type);
  const [openedFor, setOpenedFor] = useState<ListType>(type);
  if (open && openedFor !== type) {
    // reopened for another list: jump to its tab
    setOpenedFor(type);
    setTab(type);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("manageTitle")}
            <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">{t("adminOnly")}</span>
          </DialogTitle>
          <DialogDescription>{t("listsBody")}</DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label={t("listsTitle")} className="flex flex-wrap gap-1.5">
          {ALL_LISTS.map((l) => (
            <Button
              key={l}
              role="tab"
              aria-selected={tab === l}
              variant={tab === l ? "secondary" : "outline"}
              className={cn("min-h-9", tab === l && "border-primary font-semibold")}
              onClick={() => setTab(l)}
            >
              {t(`list_${l}` as SettingsKey)}
            </Button>
          ))}
        </div>
        <ListEditor key={tab} type={tab} />
      </DialogContent>
    </Dialog>
  );
}
