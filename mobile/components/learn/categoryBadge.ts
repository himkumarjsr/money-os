import type { LearnCategory } from "@/lib/learnContent";

/** Same palette as the PWA `badgeColors` (Tailwind 50/800 + ring 200). */
export const LEARN_BADGE: Record<LearnCategory, { bg: string; fg: string; border: string }> = {
  Basics: { bg: "#F1F5F9", fg: "#1E293B", border: "#E2E8F0" },
  Tax: { bg: "#F5F3FF", fg: "#5B21B6", border: "#DDD6FE" },
  Investment: { bg: "#ECFDF5", fg: "#065F46", border: "#A7F3D0" },
  Insurance: { bg: "#F0F9FF", fg: "#075985", border: "#BAE6FD" },
  Loans: { bg: "#FFFBEB", fg: "#78350F", border: "#FDE68A" },
  Property: { bg: "#FFF1F2", fg: "#881337", border: "#FECDD3" },
};
