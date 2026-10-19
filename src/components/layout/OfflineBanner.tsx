"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Shows a clear banner while the device has no network. */
export function OfflineBanner() {
  const t = useT(commonMessages);
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div role="status" className="flex items-start gap-2 border-b border-marigold bg-marigold/15 px-4 py-2 text-sm">
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{t("offline")}</span>
    </div>
  );
}
