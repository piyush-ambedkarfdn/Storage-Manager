"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

// Next.js 16 error boundary: receives `error` (unknown) and `retry`.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT(commonMessages);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
      <p className="text-muted-foreground">{t("errorBody")}</p>
      <Button className="min-h-11" onClick={() => retry()}>
        {t("tryAgain")}
      </Button>
    </main>
  );
}
