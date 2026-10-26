"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin bar at the top that shows at once when a link to another page is tapped, and goes away when the new page
 * arrives. Pages are rendered on the server, so on a slow connection there is otherwise no sign that the tap worked.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || a.target === "_blank" || a.hasAttribute("download") || !href.startsWith("/") || href.startsWith("//")) return;
      if (new URL(href, window.location.href).pathname === window.location.pathname) return;
      setLeaving(window.location.pathname);
      clearTimeout(timer);
      timer = setTimeout(() => setLeaving(null), 15_000); // never stay stuck
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, []);

  // visible only while we are still on the page we left
  if (!leaving || leaving !== pathname) return null;
  return (
    <div role="progressbar" aria-label="Loading" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15">
      <div className="h-full w-2/5 animate-pulse rounded-r-full bg-primary" style={{ transition: "width 8s ease-out" }} />
    </div>
  );
}
