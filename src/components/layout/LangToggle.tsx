"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

/** Switches between English and Hindi. The choice is kept in a cookie for a year. */
export function LangToggle() {
  const locale = useLocale();
  const t = useT(commonMessages);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "en" ? "hi" : "en";

  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <Button
      variant="ghost"
      className="min-h-11 px-3 font-semibold"
      onClick={toggle}
      disabled={pending}
      aria-label={t("language")}
      lang={next}
    >
      {next === "hi" ? t("switchToHindi") : t("switchToEnglish")}
    </Button>
  );
}
