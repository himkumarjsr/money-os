import { Text, View } from "react-native";
import type { PriorityPlan } from "@/lib/priorityEngine";
import {
  Colors,
  Radius,
  Spacing,
  themedStyles,
  tintBg,
} from "@/constants/theme";
import { shared } from "./shared";

type Fd = NonNullable<PriorityPlan["fdSuggestion"]>;

/** Web renders the CTA as a button with no handler, so it is display-only here. */
export function FdSuggestionCard({ fd }: { fd: Fd }) {
  return (
    <View style={[shared.card, styles.bordered]}>
      <Text style={shared.cardTitle}>FD opportunity</Text>
      <Text style={styles.fdMessage}>{fd.message}</Text>
      <View style={styles.fdCta}>
        <Text style={styles.fdCtaText}>{fd.cta}</Text>
      </View>
    </View>
  );
}

export function DoThisFirst({ text }: { text?: string }) {
  return (
    <View style={[styles.callout, styles.amber]}>
      <Text style={styles.amberLabel}>DO THIS FIRST — THIS WEEK</Text>
      <Text style={styles.amberText}>{text}</Text>
    </View>
  );
}

export function Encouragement({ text }: { text?: string }) {
  return (
    <View style={[styles.callout, styles.green]}>
      <Text style={styles.greenText}>
        {text ||
          "You have already taken the hardest step by starting. Stay consistent and your score will improve."}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  bordered: { borderWidth: 1, borderColor: Colors.border },
  fdMessage: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fdCta: {
    marginTop: Spacing.md,
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fdCtaText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
  callout: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  amber: { borderColor: "#E7D7A7", backgroundColor: tintBg("#FFF4D8") },
  amberLabel: { fontSize: 12, fontWeight: "600", color: Colors.warning },
  amberText: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  green: { borderColor: tintBg("#CBEBDD"), backgroundColor: tintBg("#E8F6F1") },
  greenText: { fontSize: 14, color: Colors.success, lineHeight: 20 },
}));
