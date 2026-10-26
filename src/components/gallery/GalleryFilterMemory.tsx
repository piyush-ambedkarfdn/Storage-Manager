"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { clearDraft, draftKey, loadDraft, saveDraft, TTL } from "@/lib/drafts/store";
import { useT } from "@/lib/i18n/provider";
import { galleryFiltersMessages } from "@/lib/i18n/messages/galleryFilters";

/**
 * Remembers the gallery filters for 30 minutes in this tab. Coming back to the Gallery from another tab (with a plain
 * address) puts them back, so switching tabs never throws away what was set. "Clear all filters" forgets them.
 */
export function GalleryFilterMemory() {
  const t = useT(galleryFiltersMessages);
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const key = draftKey(profile.id, "gallery-filters");
  const first = useRef(true);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!qs) {
        // arrived with a plain address: bring back the filters from a moment ago, if there are any
        const saved = loadDraft<string>(key, "session");
        if (saved) {
          router.replace(`${pathname}?${saved}`, { scroll: false });
          void Promise.resolve().then(() => setRestored(true));
        }
        return;
      }
    }
    // from here on the address is the truth: keep it, or forget it once everything was cleared
    if (qs) saveDraft(key, qs, TTL.galleryFilters, "session");
    else clearDraft(key, "session");
  }, [qs, key, pathname, router]);

  if (!restored || !qs) return null;
  return (
    <p className="text-xs text-muted-foreground" role="status">
      {t("restored")}
    </p>
  );
}
