"use client";

import { useEffect, useState } from "react";

const REVEAL_MARGIN = 24;

/**
 * Height of the on-screen keyboard covering the bottom of the layout viewport.
 * Mobile browsers overlay the keyboard without resizing `position: fixed`
 * content, so bottom sheets must pad themselves up by this amount.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let revealTimer = 0;
    const update = () => {
      const next = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      setInset(next > 80 ? next : 0);
      window.clearTimeout(revealTimer);
      if (next > 80) revealTimer = window.setTimeout(revealFocused, 120);
    };
    const revealFocused = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return;
      if (!el.matches("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const visibleBottom = vv.height + vv.offsetTop - REVEAL_MARGIN;
      if (rect.bottom > visibleBottom || rect.top < 0) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    const onFocusIn = () => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(revealFocused, 300);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.clearTimeout(revealTimer);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return inset;
}
