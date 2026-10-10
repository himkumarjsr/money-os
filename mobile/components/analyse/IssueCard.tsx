import { View, Text, Pressable } from "react-native";
import Card from "@/components/ui/Card";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
  themedStyles,
} from "@/constants/theme";

type Props = {
  severity?: string;
  title: string;
  description?: string;
  onPress?: () => void;
};

export function IssueCard({
  severity = "warning",
  title,
  description,
  onPress,
}: Props) {
  const sev = severity || "warning";
  const critical = sev === "critical";
  const content = (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: critical
              ? Colors.error
              : sev === "warning"
                ? Colors.warning
                : Colors.success,
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.badge,
          {
            color: critical ? Colors.error : Colors.warning,
            backgroundColor: critical ? Colors.errorLight : Colors.warningLight,
          },
        ]}
      >
        {sev}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <Card style={styles.card}>{content}</Card>
      </Pressable>
    );
  }

  return <Card style={styles.card}>{content}</Card>;
}

const styles = themedStyles(() => ({
  card: { padding: Spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  badge: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.round,
    textTransform: "uppercase",
    overflow: "hidden",
  },
}));
