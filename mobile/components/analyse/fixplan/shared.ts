import { StyleSheet } from "react-native";
import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";

/** `Math.round(n).toLocaleString("en-IN")` — the web page's most common money format. */
export const inr = (n: unknown) =>
  Math.round(Number(n || 0)).toLocaleString("en-IN");

/** Unrounded `toLocaleString("en-IN")`, for places where web does not round. */
export const loc = (n: unknown) => Number(n || 0).toLocaleString("en-IN");

export const urgencyColor = (urgency: string) =>
  urgency === "critical"
    ? "#E24B4A"
    : urgency === "high"
      ? "#BA7517"
      : "#1D9E75";

export const getScoreColor = (s: number) =>
  s < 40 ? "#E24B4A" : s < 70 ? "#BA7517" : "#1D9E75";

export const getScoreBg = (s: number) =>
  s < 40 ? "#FCEBEB" : s < 70 ? "#FAEEDA" : "#E1F5EE";

export const shared = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
    paddingVertical: 2,
  },
  rowLabel: { flex: 1, fontSize: 14, color: "#5F5E5A" },
  rowValue: { fontSize: 14, color: "#5F5E5A" },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalText: { fontSize: 14, fontWeight: "700", color: Colors.success },
});
