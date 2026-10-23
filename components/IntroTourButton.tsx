"use client";

import { PlayGlyph } from "@/components/IntroTourVideo";
import { openIntroTour } from "@/lib/introTour";

/** Opens the "Why Finkoin" intro video again (see IntroTourVideo). */
export function IntroTourButton({
  location,
  label = "Watch the 30-sec tour",
  className = "",
}: {
  /** Analytics source, e.g. "home_hero". */
  location: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openIntroTour(location)}
      className={`group inline-flex min-h-10 items-center gap-2 rounded-full border border-[#534AB7]/20 bg-white/80 py-1.5 pl-1.5 pr-4 text-[13px] font-semibold text-[#534AB7] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#534AB7] text-white transition group-hover:scale-105">
        <PlayGlyph size={11} />
      </span>
      {label}
    </button>
  );
}
