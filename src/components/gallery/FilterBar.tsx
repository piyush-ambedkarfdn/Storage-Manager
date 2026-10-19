"use client";

import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isEnabled } from "@/config/features";
import { requestJson } from "@/hooks/useOptions";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { useT } from "@/lib/i18n/provider";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import type { Consent } from "@/types/photo";
import type { StaffMember } from "@/types/staff";

const ANY = "any";

/** Dates, consent, uploader, used-in-story and not-used-in-calendar filters. */
export function FilterBar() {
  const t = useT(galleryMessages);
  const { filters, setFilters } = useGalleryFilters();
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: () => requestJson<{ staff: StaffMember[] }>("/api/staff").then((r) => r.staff),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="g-from" className="text-xs">
          {t("from")}
        </Label>
        <Input id="g-from" type="date" value={filters.from ?? ""} onChange={(e) => setFilters({ from: e.target.value || undefined })} className="h-9 w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="g-to" className="text-xs">
          {t("to")}
        </Label>
        <Input id="g-to" type="date" value={filters.to ?? ""} onChange={(e) => setFilters({ to: e.target.value || undefined })} className="h-9 w-40" />
      </div>
      <Select value={filters.consent ?? ANY} onValueChange={(v) => setFilters({ consent: v === ANY ? undefined : (v as Consent) })}>
        <SelectTrigger className="h-9 w-44" aria-label={t("consent")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t("anyConsent")}</SelectItem>
          <SelectItem value="yes">{t("consent_yes")}</SelectItem>
          <SelectItem value="no">{t("consent_no")}</SelectItem>
          <SelectItem value="unknown">{t("consent_unknown")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.uploader ?? ANY} onValueChange={(v) => setFilters({ uploader: v === ANY ? undefined : v })}>
        <SelectTrigger className="h-9 w-48" aria-label={t("uploader")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>
            {t("uploader")}: {t("anyone")}
          </SelectItem>
          {(staff.data ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.full_name || s.login_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isEnabled("stories") ? (
        <Select
          value={filters.hasStory === undefined ? ANY : filters.hasStory ? "1" : "0"}
          onValueChange={(v) => setFilters({ hasStory: v === ANY ? undefined : v === "1" })}
        >
          <SelectTrigger className="h-9 w-44" aria-label={t("story")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>
              {t("story")}: {t("anyStory")}
            </SelectItem>
            <SelectItem value="1">{t("storyYes")}</SelectItem>
            <SelectItem value="0">{t("storyNo")}</SelectItem>
          </SelectContent>
        </Select>
      ) : null}
      {isEnabled("calendar") ? (
        <label className="flex h-9 items-center gap-2 text-sm">
          <Switch checked={!!filters.unused} onCheckedChange={(c) => setFilters({ unused: c || undefined })} />
          {t("unused")}
        </label>
      ) : null}
    </div>
  );
}
