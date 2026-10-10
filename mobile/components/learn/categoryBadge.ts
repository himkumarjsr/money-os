import type { LearnCategory } from "@/lib/learnContent";
import { tintBg, tintFg, themed } from "@/constants/theme";

/** Same palette as the PWA `badgeColors` (Tailwind 50/800 + ring 200). */
export const LEARN_BADGE: Record<
  LearnCategory,
  { bg: string; fg: string; border: string }
> = themed(() => ({
  Basics: {
    bg: tintBg("#F1F5F9"),
    fg: tintFg("#1E293B"),
    border: tintBg("#E2E8F0"),
  },
  Tax: {
    bg: tintBg("#F5F3FF"),
    fg: tintFg("#5B21B6"),
    border: tintBg("#DDD6FE"),
  },
  Investment: {
    bg: tintBg("#ECFDF5"),
    fg: tintFg("#065F46"),
    border: tintBg("#A7F3D0"),
  },
  Insurance: {
    bg: tintBg("#F0F9FF"),
    fg: tintFg("#075985"),
    border: tintBg("#BAE6FD"),
  },
  Loans: {
    bg: tintBg("#FFFBEB"),
    fg: tintFg("#78350F"),
    border: tintBg("#FDE68A"),
  },
  Property: { bg: tintBg("#FFF1F2"), fg: tintFg("#881337"), border: "#FECDD3" },
}));
