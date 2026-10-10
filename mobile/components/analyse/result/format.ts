import { Colors, tintBg, tintFg, themed } from "@/constants/theme";
import type { BandLabel } from "./bandLabel";

export type { BandLabel };
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
      label: Colors.textSecondary,
      body: Colors.textSecondary,
      ink: Colors.textPrimary,
      muted: Colors.textMuted,
      red: tintFg("#B42323"),
      teal: tintFg("#0F766E"),
      liability: tintFg("#8C3A3A"),
      badge: {
        critical: { bg: tintBg("#FDEDED"), fg: tintFg("#991B1B") },
        warning: { bg: tintBg("#FFF4E5"), fg: tintFg("#92400E") },
        good: { bg: tintBg("#DCFCE7"), fg: tintFg("#166534") },
      },
    }) as const,
);

export function badgeTone(label: BandLabel) {
  return label === "Critical"
    ? ResultColors.badge.critical
    : label === "Warning"
      ? ResultColors.badge.warning
      : ResultColors.badge.good;
}
