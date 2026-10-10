import { View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { Colors, FontSize, Spacing, themedStyles } from "@/constants/theme";
import { HealthScoreRing } from "@/components/ui/HealthScoreRing";

type Props = {
  score: number;
  title?: string;
  subtitle?: string;
};

export function ResultCard({ score, title = "Health score", subtitle }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <HealthScoreRing score={score} />
      </View>
    </Card>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMedium,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 4,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
}));
