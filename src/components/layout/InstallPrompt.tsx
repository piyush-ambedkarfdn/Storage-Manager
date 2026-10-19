"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isEnabled } from "@/config/features";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-prompt-dismissed";

/** Offers "Add to home screen" once the PWA phase is installed (features.pwa). */
export function InstallPrompt() {
  const t = useT(commonMessages);
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!isEnabled("pwa")) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // storage blocked: just show the prompt
    }
    if (dismissed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!event) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setEvent(null);
  }

  return (
    <div className="mx-4 my-3 rounded-lg border bg-card p-4 text-sm">
      <div className="font-semibold">{t("installTitle")}</div>
      <p className="text-muted-foreground">{t("installBody")}</p>
      <div className="mt-3 flex gap-2">
        <Button
          className="min-h-11"
          onClick={async () => {
            await event.prompt();
            setEvent(null);
          }}
        >
          {t("install")}
        </Button>
        <Button variant="outline" className="min-h-11" onClick={dismiss}>
          {t("notNow")}
        </Button>
      </div>
    </div>
  );
}
