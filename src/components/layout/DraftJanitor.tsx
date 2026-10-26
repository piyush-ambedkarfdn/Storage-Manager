"use client";

import { useEffect } from "react";
import { purgeExpiredDrafts } from "@/lib/drafts/store";
import { purgeExpiredUploadDrafts } from "@/lib/upload/draft-db";

/** Deletes drafts that passed their time limit: when the app opens and whenever the tab becomes visible again. */
export function DraftJanitor() {
  useEffect(() => {
    const sweep = () => {
      purgeExpiredDrafts();
      void purgeExpiredUploadDrafts();
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(sweep);
    else setTimeout(sweep, 2000);
    const onVisible = () => document.visibilityState === "visible" && sweep();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
