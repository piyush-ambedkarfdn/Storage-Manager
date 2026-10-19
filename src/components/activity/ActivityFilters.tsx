"use client";

import Link from "next/link";
import { Download, Images } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n/provider";
import { activityMessages, type ActivityKey } from "@/lib/i18n/messages/activity";
import { ACTIVITY_GROUPS, type ActivityGroup } from "@/types/activity-view";

export type ActivityFilterValue = { group?: ActivityGroup; from?: string; to?: string };

const ALL = "__all__";

/** Action group, dates, and the two actions: view this person's photos, export CSV. */
export function ActivityFilters({ value, onChange, user }: { value: ActivityFilterValue; onChange: (v: ActivityFilterValue) => void; user: string | null }) {
  const t = useT(activityMessages);
  const qs = new URLSearchParams();
  if (user) qs.set("user", user);
  if (value.group) qs.set("group", value.group);
  if (value.from) qs.set("from", value.from);
  if (value.to) qs.set("to", value.to);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={value.group ?? ALL} onValueChange={(v) => onChange({ ...value, group: v === ALL ? undefined : (v as ActivityGroup) })}>
        <SelectTrigger className="h-10 w-52" aria-label={t("allActions")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allActions")}</SelectItem>
          {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
            <SelectItem key={g} value={g}>
              {t(`g_${g}` as ActivityKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-1">
        <Label htmlFor="act-from" className="text-xs">
          {t("from")}
        </Label>
        <Input id="act-from" type="date" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} className="h-10 w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="act-to" className="text-xs">
          {t("to")}
        </Label>
        <Input id="act-to" type="date" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} className="h-10 w-40" />
      </div>
      <span className="flex-1" />
      {user ? (
        <Link href={`/admin/gallery?by=${user}`} className={buttonVariants({ variant: "outline", className: "min-h-10" })}>
          <Images aria-hidden /> {t("viewPhotos")}
        </Link>
      ) : null}
      <a href={`/api/activity/export?${qs}`} className={buttonVariants({ variant: "outline", className: "min-h-10" })}>
        <Download aria-hidden /> {t("exportCsv")}
      </a>
    </div>
  );
}
