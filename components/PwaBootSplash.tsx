"use client";

import { useEffect } from "react";

const SPLASH_ID = "finkoin-boot-splash";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return Boolean(mq || ios);
}

/**
 * Hides the inline HTML splash painted before React hydrates.
 * Covers the blank gap when opening the installed PWA.
 */
export default function PwaBootSplash() {
  useEffect(() => {
    const el = document.getElementById(SPLASH_ID);
    if (!el) return;

    // Browser tab: remove quietly (CSS already hides it).
    if (!isStandalonePwa()) {
      el.remove();
      return;
    }

    let removed = false;
    const hide = () => {
      if (removed) return;
      removed = true;
      el.classList.add("finkoin-boot-splash--hide");
      window.setTimeout(() => {
        el.remove();
      }, 380);
    };

    // Let the first content paint, then fade — feels intentional, not abrupt.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        window.setTimeout(hide, 220);
      });
    });

    // Safety: never leave splash stuck if something hangs.
    const maxWait = window.setTimeout(hide, 4000);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(maxWait);
    };
  }, []);

  return null;
}
