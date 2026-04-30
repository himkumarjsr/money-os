"use client";

import { cn } from "@/lib/cn";
import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  sublabel?: string;
  icon?: string;
  defaultOpen?: boolean;
  children?: ReactNode;
};

export default function SectionToggle({ label, sublabel, icon, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#E8E6F0] bg-white">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111110]">
            {icon ? `${icon} ` : ""}
            {label}
          </p>
          {sublabel ? <p className="mt-1 text-xs text-[#9B9A94]">{sublabel}</p> : null}
        </div>
        <span className={cn("relative h-6 w-11 rounded-full transition-all", open ? "bg-[#534AB7]" : "bg-[#D4D2DE]")}>
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200",
              open ? "left-[22px]" : "left-0.5",
            )}
          />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-l-[3px] border-[#534AB7] bg-transparent pb-1 pl-4 pr-0 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
