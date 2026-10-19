"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { requestJson } from "@/hooks/useOptions";
import { useInvalidateProgramFields, useProgramFields } from "@/hooks/useProgramFields";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { categoriesMessages } from "@/lib/i18n/messages/categories";
import type { ProgramField, ProgramFieldOption } from "@/types/program-fields";

const DEFAULT_COLOR = "#7A8AA3";

function useRun() {
  const invalidate = useInvalidateProgramFields();
  return async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      await invalidate();
    }
  };
}

function OptionRow({ o, first, last, onMove }: { o: ProgramFieldOption; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  const t = useT(categoriesMessages);
  const run = useRun();
  const [value, setValue] = useState(o.value);
  const [valueHi, setValueHi] = useState(o.value_hi ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patch = (body: Record<string, unknown>) => run(() => requestJson(`/api/program-field-options/${o.id}`, { method: "PATCH", body }));
  return (
    <li className={cn("flex flex-wrap items-center gap-1.5 border-b py-1.5 last:border-b-0", o.hidden && "opacity-60")}>
      <Button variant="ghost" size="icon" className="size-8" disabled={first} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
        <ArrowUp aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" disabled={last} onClick={() => onMove(1)} aria-label={t("moveDown")}>
        <ArrowDown aria-hidden />
      </Button>
      <input
        type="color"
        aria-label={`${t("colour")}: ${o.value}`}
        defaultValue={o.color ?? DEFAULT_COLOR}
        onChange={(e) => {
          const color = e.target.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => patch({ color }), 600);
        }}
        className="size-8 cursor-pointer rounded border bg-transparent p-0.5"
      />
      <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => value.trim() && value !== o.value && patch({ value: value.trim() })} className="h-8 min-w-28 flex-1" aria-label={t("choices")} />
      <Input value={valueHi} onChange={(e) => setValueHi(e.target.value)} onBlur={() => valueHi !== (o.value_hi ?? "") && patch({ value_hi: valueHi.trim() || null })} placeholder={t("choiceHi")} className="h-8 w-28" lang="hi" aria-label={t("choiceHi")} />
      <Button variant="ghost" size="icon" className="size-8" onClick={() => patch({ hidden: !o.hidden })} aria-label={o.hidden ? t("show") : t("hide")}>
        {o.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      </Button>
      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => run(() => requestJson(`/api/program-field-options/${o.id}`, { method: "DELETE" }), t("saved"))} aria-label={`${t("delete")}: ${o.value}`}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

function FieldCard({ f, first, last, onMove }: { f: ProgramField; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  const t = useT(categoriesMessages);
  const run = useRun();
  const [label, setLabel] = useState(f.label);
  const [labelHi, setLabelHi] = useState(f.label_hi ?? "");
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState(false);
  const patch = (body: Record<string, unknown>) => run(() => requestJson(`/api/program-fields/${f.id}`, { method: "PATCH", body }));

  function moveOption(i: number, d: -1 | 1) {
    const ids = f.options.map((o) => o.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    void run(() => requestJson(`/api/program-fields/${f.id}/options`, { method: "PUT", body: { ids } }));
  }

  return (
    <section className={cn("flex flex-col gap-2 rounded-lg border p-3", f.hidden && "opacity-60")}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex">
          <Button variant="ghost" size="icon" className="size-8" disabled={first} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
            <ArrowUp aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={last} onClick={() => onMove(1)} aria-label={t("moveDown")}>
            <ArrowDown aria-hidden />
          </Button>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label className="text-xs">{t("fieldName")}</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label.trim() && label !== f.label && patch({ label: label.trim() })} className="h-9 font-semibold" />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <Label className="text-xs">{t("fieldNameHi")}</Label>
          <Input value={labelHi} onChange={(e) => setLabelHi(e.target.value)} onBlur={() => labelHi !== (f.label_hi ?? "") && patch({ label_hi: labelHi.trim() || null })} className="h-9" lang="hi" />
        </div>
        <Button variant="ghost" size="sm" className="min-h-9" onClick={() => patch({ hidden: !f.hidden })}>
          {f.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />} {f.hidden ? t("show") : t("hide")}
        </Button>
        <Button variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => setDeleting(true)} aria-label={`${t("delete")}: ${f.label}`}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <RadioGroup value={f.multiple ? "many" : "one"} onValueChange={(v) => patch({ multiple: v === "many" })} className="flex gap-4">
          <label className="flex items-center gap-2">
            <RadioGroupItem value="one" /> {t("oneChoice")}
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="many" /> {t("severalChoices")}
          </label>
        </RadioGroup>
        <label className="flex items-center gap-2">
          <Switch checked={f.required} onCheckedChange={(c) => patch({ required: c })} /> {t("required")}
        </label>
      </div>
      <ul>
        {f.options.map((o, i) => (
          <OptionRow key={`${o.id}:${o.value}:${o.hidden}`} o={o} first={i === 0} last={i === f.options.length - 1} onMove={(d) => moveOption(i, d)} />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = draft.trim();
          if (!value) return;
          setDraft("");
          void run(() => requestJson(`/api/program-fields/${f.id}/options`, { method: "POST", body: { value } }));
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("addChoice")} aria-label={t("addChoice")} className="h-9 flex-1" />
        <Button type="submit" size="sm" className="min-h-9" disabled={!draft.trim()}>
          {t("add")}
        </Button>
      </form>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteField", { name: f.label })}
        body={t("deleteFieldBody")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() => run(() => requestJson(`/api/program-fields/${f.id}`, { method: "DELETE" }), t("saved"))}
      />
    </section>
  );
}

/** Admin: the categories of one program (e.g. GOONJ → Stage: Before, During, After, Distribution, Meeting). */
export function ProgramFieldsDialog({ program, onOpenChange }: { program: { id: string; name: string } | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={program !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">{program ? <Body program={program} /> : null}</DialogContent>
    </Dialog>
  );
}

function Body({ program }: { program: { id: string; name: string } }) {
  const t = useT(categoriesMessages);
  const run = useRun();
  const { fields, isLoading } = useProgramFields(program.id, true);
  const [label, setLabel] = useState("");
  const [choices, setChoices] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [required, setRequired] = useState(false);

  function moveField(i: number, d: -1 | 1) {
    const ids = fields.map((f) => f.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    void run(() => requestJson("/api/program-fields", { method: "PUT", body: { ids } }));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("manageFor", { program: program.name })}</DialogTitle>
        <DialogDescription>{t("manageBody")}</DialogDescription>
      </DialogHeader>
      {!isLoading && !fields.length ? <p className="text-sm text-muted-foreground">{t("noFields")}</p> : null}
      <div className="flex flex-col gap-3">
        {fields.map((f, i) => (
          <FieldCard key={`${f.id}:${f.label}:${f.multiple}:${f.required}:${f.hidden}`} f={f} first={i === 0} last={i === fields.length - 1} onMove={(d) => moveField(i, d)} />
        ))}
      </div>
      <form
        className="flex flex-col gap-2 rounded-lg border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          const options = choices.split("\n").map((x) => x.trim()).filter(Boolean);
          void run(async () => {
            await requestJson("/api/program-fields", { method: "POST", body: { program_id: program.id, label: label.trim(), multiple, required, options } });
            setLabel("");
            setChoices("");
          }, t("saved"));
        }}
      >
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Plus className="size-4" aria-hidden /> {t("addField")}
        </h3>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pf-label" className="text-xs">
            {t("fieldName")}
          </Label>
          <Input id="pf-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" placeholder="Stage" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pf-choices" className="text-xs">
            {t("firstChoices")}
          </Label>
          <Textarea id="pf-choices" value={choices} onChange={(e) => setChoices(e.target.value)} rows={5} placeholder={t("firstChoicesHint")} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <RadioGroup value={multiple ? "many" : "one"} onValueChange={(v) => setMultiple(v === "many")} className="flex gap-4">
            <label className="flex items-center gap-2">
              <RadioGroupItem value="one" /> {t("oneChoice")}
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="many" /> {t("severalChoices")}
            </label>
          </RadioGroup>
          <label className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={setRequired} /> {t("required")}
          </label>
        </div>
        <Button type="submit" className="min-h-10 self-start" disabled={!label.trim()}>
          {t("add")}
        </Button>
      </form>
    </>
  );
}
