import { View, Text } from "react-native";
import {
  Colors,
  Spacing,
  FontSize,
  Radius,
  themedStyles,
} from "@/constants/theme";

type Props = {
  current: number;
  total: number;
  labels?: string[];
};

export function StepIndicator({ current, total, labels }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <View key={i} style={styles.item}>
            <View style={[styles.dot, active && styles.dotActive]}>
              <Text style={[styles.dotText, active && styles.dotTextActive]}>
                {i + 1}
              </Text>
            </View>
            {labels?.[i] ? (
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}
              >
                {labels[i]}
              </Text>
            ) : null}
            {i < total - 1 ? (
              <View style={[styles.line, i < current && styles.lineActive]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  item: { flex: 1, alignItems: "center", position: "relative" },
  dot: {
    width: 28,
    height: 28,
    borderRadius: Radius.round,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  dotTextActive: { color: Colors.textWhite },
  label: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
  },
  labelActive: { color: Colors.primary, fontWeight: "600" },
  line: {
    position: "absolute",
    top: 13,
    left: "60%",
    right: "-40%",
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  lineActive: { backgroundColor: Colors.primaryMedium },
}));
