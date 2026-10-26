"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import { draftsMessages } from "@/lib/i18n/messages/drafts";

type Variant = "page" | "gallery" | "table" | "form";

/**
 * What a page looks like while it is on its way: used by loading.tsx files, so a tap on a menu item shows the
 * page's frame immediately instead of a blank screen.
 */
export function PageSkeleton({ variant = "page" }: { variant?: Variant }) {
  const t = useT(draftsMessages);
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {variant === "gallery" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : variant === "table" ? (
        <>
          <Skeleton className="h-11 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </>
      ) : variant === "form" ? (
        <>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
          <Skeleton className="h-12 w-full" />
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
