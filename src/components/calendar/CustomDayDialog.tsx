"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { calendarMessages } from "@/lib/i18n/messages/calendar";
import { DAY_SCOPES, type CustomDay, type DayScope } from "@/types/days";

/** Add or edit a day of your own: a local festival, the organisation's day, or a moving date for one year. */
export function CustomDayDialog({ day, open, onOpenChange, onSaved }: { day: CustomDay | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open ? <Body day={day} onOpenChange={onOpenChange} onSaved={onSaved} /> : null}</DialogContent>
    </Dialog>
  );
}

function Body({ day, onOpenChange, onSaved }: { day: CustomDay | null; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const t = useT(calendarMessages);
  const now = new Date();
  const [name, setName] = useState(day?.name ?? "");
  const [nameHi, setNameHi] = useState(day?.name_hi ?? "");
  const [month, setMonth] = useState(day?.month ?? now.getMonth() + 1);
  const [d, setD] = useState(day?.day ?? now.getDate());
  const [oneYear, setOneYear] = useState(!!day?.year);
  const [year, setYear] = useState(day?.year ?? now.getFullYear());
  const [scope, setScope] = useState<DayScope>(day?.scope ?? "local");
  const [tags, setTags] = useState((day?.tags ?? []).join(", "));
  const [note, setNote] = useState(day?.note ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = {
        name,
        name_hi: nameHi || null,
        month,
        day: d,
        year: oneYear ? year : null,
        scope,
        tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
        note: note || null,
      };
      await requestJson(day ? `/api/days/custom/${day.id}` : "/api/days/custom", { method: day ? "PATCH" : "POST", body });
      toast.success(t("dayAdded"));
      onSaved();
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
        <DialogTitle>{t("customTitle")}</DialogTitle>
        <DialogDescription>{t("datesNote")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-name">{t("nameEn")}</Label>
          <Input id="cd-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-10" maxLength={120} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-namehi">{t("nameHi")}</Label>
          <Input id="cd-namehi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} className="min-h-10" maxLength={120} lang="hi" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-day">{t("day")}</Label>
            <Input id="cd-day" type="number" min={1} max={31} value={d} onChange={(e) => setD(Number(e.target.value))} className="min-h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-month">{t("month")}</Label>
            <Input id="cd-month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="min-h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("scope")}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as DayScope)}>
              <SelectTrigger className="min-h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`scope_${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={oneYear} onCheckedChange={setOneYear} /> {oneYear ? t("onlyYear") : t("every")}
        </label>
        {oneYear ? <Input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="min-h-10 w-32" aria-label={t("onlyYear")} /> : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-tags">{t("tags")}</Label>
          <Input id="cd-tags" value={tags} onChange={(e) => setTags(e.target.value)} className="min-h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-note">{t("note")}</Label>
          <Input id="cd-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-10" maxLength={500} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button className="min-h-11" onClick={save} disabled={busy || !name.trim()}>
          {busy ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
