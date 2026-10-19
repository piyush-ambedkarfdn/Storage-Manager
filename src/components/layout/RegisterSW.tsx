"use client";

import { useEffect } from "react";
import { isEnabled } from "@/config/features";

/** Registers public/sw.js once the PWA phase (10) is installed. Does nothing before that. */
export function RegisterSW() {
  useEffect(() => {
    if (!isEnabled("pwa") || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[sw] register failed", err));
  }, []);
  return null;
}
