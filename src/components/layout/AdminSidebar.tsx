"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_NAV } from "@/config/nav";
import { isEnabled } from "@/config/features";
import { APP } from "@/config/app";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT(commonMessages);
  const items = ADMIN_NAV.filter((i) => !i.feature || isEnabled(i.feature));
  return (
    <nav aria-label={t("adminArea")} className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm hover:bg-secondary",
              active && "border-marigold bg-secondary font-semibold",
            )}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-3 pb-3">
      <div className="text-base font-bold leading-tight">{APP.name}</div>
      <div className="text-xs text-muted-foreground">फोटो संग्रह · Admin</div>
    </div>
  );
}

/** Desktop sidebar (md and wider). */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-card px-3 py-5 md:flex">
      <Brand />
      <NavLinks />
    </aside>
  );
}

/** Menu button for phones: opens the same links in a sheet. */
export function AdminMobileNav() {
  const t = useT(commonMessages);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label={t("openMenu")}>
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 px-3 py-5">
        <SheetTitle className="sr-only">{t("adminArea")}</SheetTitle>
        <Brand />
        <NavLinks />
      </SheetContent>
    </Sheet>
  );
}
