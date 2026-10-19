"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UPLOADER_NAV } from "@/config/nav";
import { isEnabled } from "@/config/features";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

/** Bottom navigation for field staff. Hidden until the upload phase switches it on. */
export function UploaderNav() {
  const pathname = usePathname();
  const t = useT(commonMessages);
  const items = UPLOADER_NAV.filter((i) => !i.feature || isEnabled(i.feature));
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={t("navUpload")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground",
                  active && "font-bold text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
