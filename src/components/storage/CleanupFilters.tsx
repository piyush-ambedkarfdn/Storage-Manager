"use client";

import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isEnabled } from "@/config/features";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { cleanupMessages } from "@/lib/i18n/messages/cleanup";
import { CLEANUP_ONLY, type CleanupFilters as Filters, type CleanupOnly } from "@/types/cleanup";
import type { StaffMember } from "@/types/staff";

const ANY = "any";
const MONTHS = [3, 6, 12, 18, 24, 36];

/** Older than, program, uploader, and "only downloaded / unused / low quality". */
export function CleanupFilters({ value, onChange }: { value: Filters; onChange: (v: Filters) => void }) {
  const t = useT(cleanupMessages);
  const { allOptions: programs } = useOptions("program");
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => requestJson<{ staff: StaffMember[] }>("/api/staff").then((r) => r.staff) });
  const onlyChoices = CLEANUP_ONLY.filter((o) => o !== "low_quality" || isEnabled("ai"));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("olderThan")}</Label>
        <Select value={String(Math.round(value.olderThanDays / 30))} onValueChange={(v) => onChange({ ...value, olderThanDays: Number(v) * 30 })}>
          <SelectTrigger className="min-h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {t("months", { n: m })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("program")}</Label>
        <Select value={value.programId ?? ANY} onValueChange={(v) => onChange({ ...value, programId: v === ANY ? null : v })}>
          <SelectTrigger className="min-h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t("anyProgram")}</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("uploader")}</Label>
        <Select value={value.uploaderId ?? ANY} onValueChange={(v) => onChange({ ...value, uploaderId: v === ANY ? null : v })}>
          <SelectTrigger className="min-h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t("anyone")}</SelectItem>
            {(staff.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name || s.login_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("only")}</Label>
        <Select value={value.only ?? ANY} onValueChange={(v) => onChange({ ...value, only: v === ANY ? null : (v as CleanupOnly) })}>
          <SelectTrigger className="min-h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t("onlyAll")}</SelectItem>
            {onlyChoices.map((o) => (
              <SelectItem key={o} value={o}>
                {t(`only_${o}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
