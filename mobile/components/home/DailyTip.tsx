import { View, Text } from "react-native";
import {
  Colors,
  Spacing,
  Radius,
  FontSize,
  Shadow,
  themedStyles,
} from "@/constants/theme";

type Props = {
  emoji?: string | null;
  title: string;
  content: string;
};

export function DailyTip({ emoji, title, content }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji || "💡"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.content} numberOfLines={2}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  emoji: { fontSize: 28 },
  title: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
}));
