import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { APP } from "@/config/app";

/** Shell for sign-in and change-password: one centred card, mobile first. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2">
        <div>
          <div className="font-bold">{APP.name}</div>
          <div className="text-xs text-muted-foreground">फोटो संग्रह</div>
        </div>
        <div className="flex items-center">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </main>
    </div>
  );
}
