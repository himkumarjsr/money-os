"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Theme-colored info tooltip for field helpers (replaces long helper text under inputs). */
export default function FieldTooltip({
  text,
  label = "More info",
}: {
  text: string;
  label?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;

    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const pad = 8;
      const maxW = Math.min(260, Math.max(160, window.innerWidth - pad * 2));
      let left = r.left + r.width / 2 - maxW / 2;
      left = Math.max(pad, Math.min(left, window.innerWidth - maxW - pad));

      const boxH = boxRef.current?.offsetHeight ?? 88;
      const below = r.bottom + 6;
      const above = r.top - boxH - 6;
      const top =
        below + boxH <= window.innerHeight - pad ? below : Math.max(pad, above);

      setPos({ top, left, width: maxW });
    };

    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || boxRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!text.trim()) return null;

  return (
    <span className="relative inline-flex shrink-0 align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#534AB7]/35 bg-[#EEEDFE] text-[11px] font-bold leading-none text-[#534AB7] hover:bg-[#E0DDFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]/40"
      >
        i
      </button>
      {open && mounted
        ? createPortal(
            <span
              ref={boxRef}
              id={id}
              role="tooltip"
              className="fixed z-[80] rounded-xl border border-[#E8E6F0] bg-white px-3 py-2 text-left text-[12px] font-normal leading-snug text-[#5F5E5A] shadow-[0_8px_24px_rgba(30,30,60,0.12)]"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxWidth: "calc(100vw - 16px)",
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
