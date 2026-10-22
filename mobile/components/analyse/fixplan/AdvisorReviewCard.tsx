/** Adviser's review - port of web components/analyse/AdvisorReviewSection.tsx. */
import { Text, View } from "react-native";
import type { AdvisorReview } from "@/lib/advisorReview";
import { Colors, themedStyles } from "@/constants/theme";
import { shared } from "./shared";

function ActionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.listTitle}>{title.toUpperCase()}</Text>
      {items.map((text) => (
        <View key={text} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

export function AdvisorReviewCard({ review }: { review: AdvisorReview }) {
  return (
    <>
      {review.fixes.length > 0 ? (
        <View style={[shared.card, styles.bordered]}>
          <Text style={shared.cardTitle}>Money in the wrong place</Text>
          <Text style={styles.sub}>
            What an adviser would change in what you already have.
          </Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {review.fixes.map((f) => (
              <View key={`${f.id}:${f.title}`} style={styles.fix}>
                <Text style={styles.fixTitle}>{f.title}</Text>
                <Text style={styles.fixDetail}>{f.detail}</Text>
                {f.yearlyGain && f.yearlyGain > 0 ? (
                  <Text style={styles.gain}>
                    About ₹{f.yearlyGain.toLocaleString("en-IN")} a year better
                    off
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={[shared.card, styles.bordered, { gap: 14 }]}>
        <Text style={shared.cardTitle}>Your action list</Text>
        <ActionList title="This week" items={review.thisWeek} />
        <ActionList title="Every month" items={review.monthly} />
        <ActionList title="Every year" items={review.yearly} />
      </View>
    </>
  );
}

const styles = themedStyles(() => ({
  bordered: { borderWidth: 1, borderColor: Colors.border },
  sub: { marginTop: 4, fontSize: 13, color: Colors.textSecondary },
  fix: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.surfaceAlt,
    gap: 2,
  },
  fixTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  fixDetail: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  gain: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.success,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: Colors.primaryText,
  },
  bulletRow: { flexDirection: "row", gap: 8 },
  bullet: { fontSize: 14, color: Colors.primaryText },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
}));
