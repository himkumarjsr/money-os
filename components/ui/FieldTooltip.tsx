"use client";

import { useId, useState } from "react";

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
  if (!text.trim()) return null;

  return (
    <span className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#534AB7]/35 bg-[#EEEDFE] text-[11px] font-bold leading-none text-[#534AB7] hover:bg-[#E0DDFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]/40"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-[min(260px,70vw)] -translate-x-1/2 rounded-xl border border-[#E8E6F0] bg-white px-3 py-2 text-left text-[12px] font-normal leading-snug text-[#5F5E5A] shadow-[0_8px_24px_rgba(30,30,60,0.12)]"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
