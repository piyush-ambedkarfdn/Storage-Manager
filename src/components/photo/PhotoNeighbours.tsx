"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { photoMessages } from "@/lib/i18n/messages/photo";

/** Back to the gallery (same filters), and Previous / Next inside that filter. ← and → work on this page. */
export function PhotoNeighbours({ prevId, nextId, from }: { prevId: string | null; nextId: string | null; from: string }) {
  const t = useT(photoMessages);
  const router = useRouter();
  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
  const prevHref = prevId ? `/admin/photos/${prevId}${suffix}` : null;
  const nextHref = nextId ? `/admin/photos/${nextId}${suffix}` : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === "ArrowLeft" && prevHref) router.push(prevHref);
      if (e.key === "ArrowRight" && nextHref) router.push(nextHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevHref, nextHref, router]);

  const btn = buttonVariants({ variant: "outline", className: "min-h-10" });
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2" aria-label={t("position")}>
      <Link href={`/admin/gallery${from ? `?${from}` : ""}`} className={btn}>
        <ArrowLeft aria-hidden /> {t("back")}
      </Link>
      <div className="flex gap-2">
        {prevHref ? (
          <Link href={prevHref} className={btn} rel="prev">
            <ChevronLeft aria-hidden /> {t("prev")}
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-50")} aria-disabled>
            <ChevronLeft aria-hidden /> {t("prev")}
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={btn} rel="next">
            {t("next")} <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className={cn(btn, "pointer-events-none opacity-50")} aria-disabled>
            {t("next")} <ChevronRight aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
