import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { getT } from "@/lib/i18n/server";
import { authMessages } from "@/lib/i18n/messages/auth";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const t = await getT(authMessages);
  const next = typeof params.next === "string" ? params.next : undefined;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  return (
    <>
      <h1 className="text-xl font-bold">{t("signInTitle")}</h1>
      <p className="mb-5 text-sm text-muted-foreground">{t("signInSub")}</p>
      <LoginForm next={next} reason={reason} />
    </>
  );
}
