import { requireUser } from "@/lib/auth";
import { ProfileProvider } from "@/components/layout/ProfileProvider";
import { UploaderNav } from "@/components/layout/UploaderNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { APP } from "@/config/app";

/** Mobile-first shell for field staff (admins can use it too): header, offline banner, bottom navigation. */
export default async function UploaderLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <ProfileProvider profile={profile}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-card px-3 pt-[env(safe-area-inset-top)]">
          <span className="truncate py-2 font-bold">{APP.name}</span>
          <div className="flex items-center">
            <LangToggle />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <OfflineBanner />
        <InstallPrompt />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-24">{children}</main>
        <UploaderNav />
      </div>
    </ProfileProvider>
  );
}
