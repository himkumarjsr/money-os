"use client";

import { clearBodyScrollLocks } from "@/lib/bodyScrollLock";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scroll the window (document) to top on route change. */
export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    // Clear leftover modal scroll-locks that would block document scroll.
    clearBodyScrollLocks();

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
