import { requireAdmin } from "@/lib/auth";
import { ProfileProvider } from "@/components/layout/ProfileProvider";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/AdminSidebar";
import { UserMenu } from "@/components/layout/UserMenu";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

/** Desktop-first admin shell: sidebar, top bar, content. Admins only. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <ProfileProvider profile={profile}>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-card/95 px-3 backdrop-blur">
            <AdminMobileNav />
            <div className="flex-1" />
            <LangToggle />
            <ThemeToggle />
            <UserMenu />
          </header>
          <OfflineBanner />
          <main className="flex-1 px-4 py-6 md:px-7">{children}</main>
        </div>
      </div>
    </ProfileProvider>
  );
}
