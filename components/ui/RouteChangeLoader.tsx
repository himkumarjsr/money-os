"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Theme progress bar on client navigations (hard refresh uses app/loading.tsx).
 */
export default function RouteChangeLoader() {
  const pathname = usePathname();
  const first = useRef(true);
  const [active, setActive] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), 480);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        background: "transparent",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "40%",
          borderRadius: 999,
          background: "var(--color-primary, #534AB7)",
          boxShadow: "0 0 12px rgba(83, 74, 183, 0.45)",
          animation: "finkoin-route-bar 0.48s ease-out forwards",
        }}
      />
      <style>{`
        @keyframes finkoin-route-bar {
          0% { transform: translateX(-100%); width: 30%; }
          60% { transform: translateX(120%); width: 45%; }
          100% { transform: translateX(280%); width: 20%; opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
