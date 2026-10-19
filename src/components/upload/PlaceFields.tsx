"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ManageOptionsDialog } from "@/components/settings/ManageOptionsDialog";
import { NameCombobox, type PlaceValue } from "@/components/upload/NameCombobox";
import { useOptions } from "@/hooks/useOptions";
import { usePlaces } from "@/hooks/usePlaces";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";

export type PlaceState = {
  program_id: string | null;
  district_id: string | null;
  block: PlaceValue | null;
  panchayat: PlaceValue | null;
  village: PlaceValue | null;
};

export type PlaceErrors = Partial<Record<"program_id" | "district_id" | "block_id" | "panchayat_id" | "village_id", string>>;

/** Program, then District → Block → Panchayat → Village. Staff assigned to some districts or programs see only those. */
export function PlaceFields({
  value,
  onChange,
  errors,
}: {
  value: PlaceState;
  onChange: (v: PlaceState) => void;
  errors: PlaceErrors;
}) {
  const t = useT(uploadMessages);
  const profile = useProfile();
  const isAdmin = profile.role === "admin";
  const [manage, setManage] = useState(false);
  const { options: programs } = useOptions("program");
  const { data: districts } = usePlaces("district", { limit: 1000 });

  const allowedPrograms = profile.assigned_program_ids?.length
    ? programs.filter((p) => profile.assigned_program_ids!.includes(p.id))
    : programs;
  const allowedDistricts = profile.assigned_district_ids?.length
    ? (districts?.items ?? []).filter((d) => profile.assigned_district_ids!.includes(d.id))
    : (districts?.items ?? []);

  const err = (k: keyof PlaceErrors) =>
    errors[k] ? (
      <p id={`err-${k}`} className="text-xs text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="program">{t("program")}</Label>
          {isAdmin ? (
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setManage(true)}>
              {t("manageList")}
            </Button>
          ) : null}
        </div>
        <Select value={value.program_id ?? ""} onValueChange={(v) => onChange({ ...value, program_id: v })}>
          <SelectTrigger id="program" className="min-h-11 w-full" aria-invalid={!!errors.program_id || undefined}>
            <SelectValue placeholder={t("choose")} />
          </SelectTrigger>
          <SelectContent>
            {allowedPrograms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err("program_id")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="district">{t("district")}</Label>
        <Select
          value={value.district_id ?? ""}
          onValueChange={(v) => onChange({ ...value, district_id: v, block: null, panchayat: null, village: null })}
        >
          <SelectTrigger id="district" className="min-h-11 w-full" aria-invalid={!!errors.district_id || undefined}>
            <SelectValue placeholder={t("choose")} />
          </SelectTrigger>
          <SelectContent>
            {allowedDistricts.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err("district_id")}
      </div>

      <div>
        <NameCombobox
          key={`b-${value.district_id}`}
          level="block"
          parentId={value.district_id}
          value={value.block}
          onChange={(block) => onChange({ ...value, block, panchayat: null, village: null })}
          label={t("block")}
          levelLabel={t("block")}
          parentLabel={t("district")}
          invalid={!!errors.block_id}
          errorId={errors.block_id ? "err-block_id" : undefined}
        />
        {err("block_id")}
      </div>
      <div>
        <NameCombobox
          key={`p-${value.block?.id}`}
          level="panchayat"
          parentId={value.block?.id ?? null}
          value={value.panchayat}
          onChange={(panchayat) => onChange({ ...value, panchayat, village: null })}
          label={t("panchayat")}
          levelLabel={t("panchayat")}
          parentLabel={t("block")}
          invalid={!!errors.panchayat_id}
          errorId={errors.panchayat_id ? "err-panchayat_id" : undefined}
        />
        {err("panchayat_id")}
      </div>
      <div>
        <NameCombobox
          key={`v-${value.panchayat?.id}`}
          level="village"
          parentId={value.panchayat?.id ?? null}
          value={value.village}
          onChange={(village) => onChange({ ...value, village })}
          label={t("village")}
          levelLabel={t("village")}
          parentLabel={t("panchayat")}
          invalid={!!errors.village_id}
          errorId={errors.village_id ? "err-village_id" : undefined}
        />
        {err("village_id")}
      </div>
      {isAdmin ? <ManageOptionsDialog type="program" open={manage} onOpenChange={setManage} /> : null}
    </div>
  );
}
