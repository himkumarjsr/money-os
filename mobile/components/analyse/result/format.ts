/** `₹12,34,567` — same as web's `₹{Math.round(v).toLocaleString("en-IN")}`. */
export function inr(v: number): string {
  return `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
}

export const ResultColors = {
  pageBg: "#F7F7F4",
  border: "#E8E6F0",
  borderSoft: "#F0EFF8",
  softBg: "#FAFAFE",
  label: "#5F5E5A",
  body: "#454442",
  ink: "#111110",
  muted: "#9B9A94",
  red: "#B42323",
  teal: "#0F766E",
  liability: "#8C3A3A",
  badge: {
    critical: { bg: "#FDEDED", fg: "#991B1B" },
    warning: { bg: "#FFF4E5", fg: "#92400E" },
    good: { bg: "#DCFCE7", fg: "#166534" },
  },
} as const;

export type BandLabel = "Critical" | "Warning" | "Good";

export function badgeTone(label: BandLabel) {
  return label === "Critical"
    ? ResultColors.badge.critical
    : label === "Warning"
      ? ResultColors.badge.warning
      : ResultColors.badge.good;
}
