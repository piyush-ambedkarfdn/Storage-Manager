"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n/provider";
import { staffMessages } from "@/lib/i18n/messages/staff";

export type StaffFilterValue = {
  q: string;
  role: "all" | "admin" | "uploader";
  status: "all" | "active" | "inactive";
};

export const EMPTY_FILTERS: StaffFilterValue = { q: "", role: "all", status: "all" };

export function StaffFilters({
  value,
  onChange,
}: {
  value: StaffFilterValue;
  onChange: (next: StaffFilterValue) => void;
}) {
  const t = useT(staffMessages);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder={t("search")}
          aria-label={t("search")}
          className="min-h-10 pl-9"
        />
      </div>
      <Select value={value.role} onValueChange={(v) => onChange({ ...value, role: v as StaffFilterValue["role"] })}>
        <SelectTrigger className="min-h-10 w-40" aria-label={t("colRole")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allRoles")}</SelectItem>
          <SelectItem value="uploader">{t("roleUploader")}</SelectItem>
          <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.status} onValueChange={(v) => onChange({ ...value, status: v as StaffFilterValue["status"] })}>
        <SelectTrigger className="min-h-10 w-40" aria-label={t("colStatus")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="active">{t("statusActive")}</SelectItem>
          <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
