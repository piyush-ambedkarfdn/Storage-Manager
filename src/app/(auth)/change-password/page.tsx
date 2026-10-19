import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getT } from "@/lib/i18n/server";
import { authMessages } from "@/lib/i18n/messages/auth";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?reason=inactive");
  const t = await getT(authMessages);
  return (
    <>
      <h1 className="text-xl font-bold">{t("changeTitle")}</h1>
      {profile.must_change_password ? <p className="mb-5 text-sm text-muted-foreground">{t("changeSub")}</p> : <div className="mb-5" />}
      <ChangePasswordForm />
    </>
  );
}
