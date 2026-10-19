import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isEnabled } from "@/config/features";
import { getT } from "@/lib/i18n/server";
import { commonMessages } from "@/lib/i18n/messages/common";
import { ProfileProvider } from "@/components/layout/ProfileProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { EmptyState } from "@/components/shared/EmptyState";
import { APP } from "@/config/app";

/** Home: admins go to /admin, field staff to /upload (once the upload phase is installed). */
export default async function HomePage() {
  const { profile } = await requireUser();
  if (profile.role === "admin") redirect("/admin");
  if (isEnabled("upload")) redirect("/upload");

  const t = await getT(commonMessages);
  const name = profile.full_name || profile.login_id || "";
  return (
    <ProfileProvider profile={profile}>
      <header className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2">
        <span className="font-bold">{APP.name}</span>
        <div className="flex items-center">
          <LangToggle />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-md p-4">
        <EmptyState title={t("staffHomeTitle", { name })} body={t("staffHomeBody")} />
      </main>
    </ProfileProvider>
  );
}
