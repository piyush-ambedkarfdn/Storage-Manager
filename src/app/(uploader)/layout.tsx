import { requireUser } from "@/lib/auth";
import { ProfileProvider } from "@/components/layout/ProfileProvider";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/AdminSidebar";
import { UploaderNav } from "@/components/layout/UploaderNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { APP } from "@/config/app";

/**
 * Upload and My uploads. Field staff get the mobile shell with the bottom navigation.
 * Admins get the admin sidebar (menu button on phones), so every admin page is one tap away.
 */
export default async function UploaderLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();

  if (profile.role === "admin") {
    return (
      <ProfileProvider profile={profile}>
        <div className="flex min-h-dvh">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-card/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
              <AdminMobileNav />
              <div className="flex-1" />
              <LangToggle />
              <ThemeToggle />
              <UserMenu />
            </header>
            <OfflineBanner />
            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
          </div>
        </div>
      </ProfileProvider>
    );
  }

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
