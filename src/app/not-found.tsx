import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { commonMessages } from "@/lib/i18n/messages/common";

export default async function NotFound() {
  const t = await getT(commonMessages);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className={buttonVariants({ className: "min-h-11" })}>
        {t("goHome")}
      </Link>
    </main>
  );
}
