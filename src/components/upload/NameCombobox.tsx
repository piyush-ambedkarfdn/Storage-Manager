"use client";

import { useId, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestJson } from "@/hooks/useOptions";
import { useInvalidatePlaces, usePlaces } from "@/hooks/usePlaces";
import { useSimilarNames } from "@/hooks/useSimilarNames";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import type { ChildLevel, Place } from "@/types/places";

export type PlaceValue = { id: string; name: string; pending?: boolean };

/**
 * Pick a block, panchayat or village under its parent, or type one that is missing.
 * A typed name is checked against existing names (Chatra vs Chhatra): same spelling is used directly,
 * a close one asks "Did you mean …?", and a genuinely new name is saved for the admin to check.
 */
export function NameCombobox({
  level,
  parentId,
  value,
  onChange,
  label,
  levelLabel,
  parentLabel,
  invalid,
  errorId,
}: {
  level: ChildLevel;
  parentId: string | null;
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
  label: string;
  levelLabel: string;
  parentLabel: string;
  invalid?: boolean;
  errorId?: string;
}) {
  const t = useT(uploadMessages);
  const id = useId();
  const listId = `${id}-list`;
  const invalidate = useInvalidatePlaces();
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [different, setDifferent] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data } = usePlaces(level, { parentId, limit: 1000, enabled: !!parentId });
  const all = data?.items ?? [];
  const typed = text.trim();
  const lower = typed.toLowerCase();
  const options = (lower ? all.filter((p) => p.name.toLowerCase().includes(lower)) : all).slice(0, 50);
  const exactOption = all.find((p) => p.name.toLowerCase() === lower);
  const needsCheck = !!parentId && typed.length >= 2 && !exactOption && value?.name !== typed;
  const similar = useSimilarNames(level, typed, parentId, needsCheck);
  const sameParentWarn = (similar.data?.warn ?? []).slice(0, 3);
  const exact = similar.data?.exact ?? null;

  function pick(p: Pick<Place, "id" | "name"> & { approved?: boolean }) {
    onChange({ id: p.id, name: p.name, pending: p.approved === false });
    setText(p.name);
    setOpen(false);
    setDifferent(false);
  }

  async function addNew() {
    if (!parentId || !typed) return;
    setAdding(true);
    try {
      const { place } = await requestJson<{ place: Place; existed: boolean }>("/api/places", {
        method: "POST",
        body: { level, name: typed, parent_id: parentId },
      });
      pick(place);
      await invalidate();
      if (!place.approved) toast.info(t("suggestedNew", { name: place.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  const disabled = !parentId;
  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        autoComplete="off"
        disabled={disabled}
        placeholder={disabled ? t("chooseAbove", { level: parentLabel }) : t("typeToSearch")}
        value={text}
        className="min-h-11"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          setDifferent(false);
          if (value) onChange(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && !disabled && options.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {options.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={value?.id === p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={cn("flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm", i === active && "bg-secondary")}
            >
              {value?.id === p.id ? <Check className="size-4" aria-hidden /> : <span className="size-4" />}
              {p.name}
              {!p.approved ? <span className="text-xs text-muted-foreground">({t("notInList")})</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {needsCheck && !open && similar.data ? (
        exact && exact.sameParent ? (
          <div role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm">
            {t("found", { name: exact.name })}{" "}
            <Button size="sm" variant="outline" className="ml-1 min-h-9" onClick={() => pick(exact)}>
              {t("useName", { name: exact.name })}
            </Button>
          </div>
        ) : sameParentWarn.length && !different ? (
          <div role="status" className="flex flex-col gap-2 rounded-md border border-marigold bg-marigold/15 px-3 py-2 text-sm">
            <div>
              <b>{t("didYouMean", { name: sameParentWarn[0].name })}</b> {t("didYouMeanBody")}
            </div>
            <div className="flex flex-wrap gap-2">
              {sameParentWarn.map((m) => (
                <Button key={m.id} size="sm" className="min-h-10" onClick={() => pick(m)}>
                  {t("useName", { name: m.name })}
                  {!m.sameParent ? ` ${t("otherPlace", { parent: parentLabel })}` : ""}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="min-h-10" onClick={() => setDifferent(true)}>
                {t("itsDifferent")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="min-h-10 self-start" onClick={addNew} disabled={adding}>
            <Plus aria-hidden /> {adding ? t("adding") : t("suggestNew", { name: typed, level: levelLabel })}
          </Button>
        )
      ) : null}
      {value?.pending ? <p className="text-xs text-muted-foreground">{t("suggestedNew", { name: value.name })}</p> : null}
    </div>
  );
}
