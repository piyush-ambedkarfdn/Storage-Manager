"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NameCombobox, type PlaceValue } from "@/components/upload/NameCombobox";
import { ACTIVE_ACTIVITY_TYPES } from "@/config/activity-types";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { usePlaces } from "@/hooks/usePlaces";
import { useLocale, useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import { commonMessages } from "@/lib/i18n/messages/common";

const KEEP = "keep";

/** Change program, place, activity, date, consent or the children flag on one or many photos. */
export function BulkEditDialog({
  ids,
  open,
  onOpenChange,
  onDone,
}: {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {open ? <Body ids={ids} onOpenChange={onOpenChange} onDone={onDone} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({ ids, onOpenChange, onDone }: { ids: string[]; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const t = useT(galleryMessages);
  const tc = useT(commonMessages);
  const locale = useLocale();
  const { options: programs } = useOptions("program");
  const { data: districts } = usePlaces("district", { limit: 1000 });
  const [program, setProgram] = useState(KEEP);
  const [changePlace, setChangePlace] = useState(false);
  const [district, setDistrict] = useState<string | null>(null);
  const [block, setBlock] = useState<PlaceValue | null>(null);
  const [panchayat, setPanchayat] = useState<PlaceValue | null>(null);
  const [village, setVillage] = useState<PlaceValue | null>(null);
  const [activity, setActivity] = useState(KEEP);
  const [date, setDate] = useState("");
  const [consent, setConsent] = useState(KEEP);
  const [children, setChildren] = useState(KEEP);
  const [busy, setBusy] = useState(false);

  const set: Record<string, unknown> = {};
  if (program !== KEEP) set.program_id = program;
  if (changePlace && district && block && panchayat && village) {
    Object.assign(set, { district_id: district, block_id: block.id, panchayat_id: panchayat.id, village_id: village.id });
  }
  if (activity !== KEEP) set.activity_type = activity;
  if (date) set.event_date = date;
  if (consent !== KEEP) set.consent = consent;
  if (children !== KEEP) set.has_children = children === "yes";
  const ready = Object.keys(set).length > 0 && (!changePlace || !!village);

  async function apply() {
    setBusy(true);
    try {
      const { updated } = await requestJson<{ updated: number }>("/api/photos/bulk", { method: "POST", body: { ids, set } });
      toast.success(t("applied", { n: updated }));
      onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const keepItem = <SelectItem value={KEEP}>{t("keep")}</SelectItem>;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("bulkTitle", { n: ids.length })}</DialogTitle>
        <DialogDescription>{t("bulkHint")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("program")}</Label>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger className="min-h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {keepItem}
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={changePlace} onCheckedChange={setChangePlace} /> {t("changePlace")}
        </label>
        {changePlace ? (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("district")}</Label>
              <Select
                value={district ?? ""}
                onValueChange={(v) => {
                  setDistrict(v);
                  setBlock(null);
                  setPanchayat(null);
                  setVillage(null);
                }}
              >
                <SelectTrigger className="min-h-10 w-full">
                  <SelectValue placeholder="…" />
                </SelectTrigger>
                <SelectContent>
                  {(districts?.items ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NameCombobox key={`b${district}`} level="block" parentId={district} value={block} onChange={(v) => (setBlock(v), setPanchayat(null), setVillage(null))} label={t("block")} levelLabel={t("block")} parentLabel={t("district")} />
            <NameCombobox key={`p${block?.id}`} level="panchayat" parentId={block?.id ?? null} value={panchayat} onChange={(v) => (setPanchayat(v), setVillage(null))} label={t("panchayat")} levelLabel={t("panchayat")} parentLabel={t("block")} />
            <NameCombobox key={`v${panchayat?.id}`} level="village" parentId={panchayat?.id ?? null} value={village} onChange={setVillage} label={t("village")} levelLabel={t("village")} parentLabel={t("panchayat")} />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("activityType")}</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger className="min-h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keepItem}
                {ACTIVE_ACTIVITY_TYPES.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {locale === "hi" ? a.labelHi : a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-date">{t("eventDate")}</Label>
            <Input id="bulk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("consent")}</Label>
            <Select value={consent} onValueChange={setConsent}>
              <SelectTrigger className="min-h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keepItem}
                <SelectItem value="yes">{t("consent_yes")}</SelectItem>
                <SelectItem value="no">{t("consent_no")}</SelectItem>
                <SelectItem value="unknown">{t("consent_unknown")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("hasChildren")}</Label>
            <Select value={children} onValueChange={setChildren}>
              <SelectTrigger className="min-h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keepItem}
                <SelectItem value="yes">{t("yes")}</SelectItem>
                <SelectItem value="no">{t("no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {tc("cancel")}
        </Button>
        <Button className="min-h-11" onClick={apply} disabled={!ready || busy}>
          {t("apply", { n: ids.length })}
        </Button>
      </DialogFooter>
    </>
  );
}
