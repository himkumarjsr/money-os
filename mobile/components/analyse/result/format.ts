import { tintBg, tintFg, themed } from "@/constants/theme";
/** `₹12,34,567` — same as web's `₹{Math.round(v).toLocaleString("en-IN")}`. */
export function inr(v: number): string {
  return `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
}

export const ResultColors = themed(
  () =>
    ({
      pageBg: tintBg("#F7F7F4"),
      border: tintBg("#E8E6F0"),
      borderSoft: tintBg("#F0EFF8"),
      softBg: tintBg("#FAFAFE"),
      label: "#5F5E5A",
      body: "#454442",
      ink: "#111110",
      muted: "#9B9A94",
      red: "#B42323",
      teal: "#0F766E",
      liability: "#8C3A3A",
      badge: {
        critical: { bg: tintBg("#FDEDED"), fg: tintFg("#991B1B") },
        warning: { bg: tintBg("#FFF4E5"), fg: "#92400E" },
        good: { bg: tintBg("#DCFCE7"), fg: "#166534" },
      },
    }) as const,
);

export type BandLabel = "Critical" | "Warning" | "Good";

export function badgeTone(label: BandLabel) {
  return label === "Critical"
    ? ResultColors.badge.critical
    : label === "Warning"
      ? ResultColors.badge.warning
      : ResultColors.badge.good;
}
