import { View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { Colors, FontSize, Spacing, themedStyles } from "@/constants/theme";
import { formatIndianCompact } from "@/lib/formatters";

type Props = {
  name: string;
  spent: number;
  budget?: number;
  emoji?: string;
};

export function BucketCard({ name, spent, budget, emoji = "📂" }: Props) {
  const pct =
    budget && budget > 0
      ? Math.min(100, Math.round((spent / budget) * 100))
      : null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.spent}>
            {formatIndianCompact(spent)}
            {budget != null ? ` / ${formatIndianCompact(budget)}` : ""}
          </Text>
        </View>
        {pct != null ? (
          <Text style={[styles.pct, pct >= 100 && { color: Colors.error }]}>
            {pct}%
          </Text>
        ) : null}
      </View>
      {pct != null ? (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${pct}%`,
                backgroundColor: pct >= 100 ? Colors.error : Colors.primary,
              },
            ]}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  card: { marginBottom: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  emoji: { fontSize: 24 },
  name: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  spent: { marginTop: 2, fontSize: FontSize.md, color: Colors.textSecondary },
  pct: { fontSize: FontSize.base, fontWeight: "800", color: Colors.primary },
  barTrack: {
    marginTop: Spacing.md,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
}));
