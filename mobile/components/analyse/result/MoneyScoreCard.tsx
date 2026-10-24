/**
 * Why the score is what it is (six pillars) and the actions worth the most
 * points. Port of web `components/analyse/MoneyScoreCard.tsx`.
 */
import { Text, View } from "react-native";
import type { MoneyScore } from "@/lib/moneyScore";
import { Colors, themedStyles, tintBg, tintFg } from "@/constants/theme";
import { GoldText } from "@/components/ui/GoldMirror";
import { ResultColors as C } from "./format";

const toneFor = (pct: number) =>
  pct >= 70
    ? tintFg("#1D9E75")
    : pct >= 40
      ? tintFg("#BA7517")
      : tintFg("#E24B4A");

export function MoneyScoreCard({
  score,
  showActions = true,
}: {
  score: MoneyScore;
  /** The report shows the pillars only; the actions are in the plan. */
  showActions?: boolean;
}) {
  return (
    <View style={styles.card}>
      <GoldText style={styles.eyebrow}>How your score is worked out</GoldText>
      <View style={{ gap: 12 }}>
        {score.pillars.map((p) => {
          const pct = p.max > 0 ? (p.points / p.max) * 100 : 0;
          return (
            <View key={p.id}>
              <View style={styles.row}>
                <Text style={styles.label}>{p.label}</Text>
                <Text style={styles.points}>
                  {Math.round(p.points)}
                  <Text style={styles.max}>/{p.max}</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: toneFor(pct) },
                  ]}
                />
              </View>
              <Text style={styles.line}>{p.line}</Text>
            </View>
          );
        })}
      </View>

      {showActions && score.topActions.length > 0 ? (
        <View style={styles.actions}>
          <Text style={styles.actionsTitle}>Raise your score</Text>
          {score.topActions.map((a, i) => (
            <View key={a.pillar} style={styles.action}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={styles.actionText}>{a.text}</Text>
              <Text style={styles.gain}>+{a.gain}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  eyebrow: {
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  label: { flex: 1, fontSize: 14, fontWeight: "600", color: C.ink },
  points: { fontSize: 14, fontWeight: "700", color: C.ink },
  max: { fontWeight: "500", color: C.body },
  track: {
    marginTop: 4,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: tintBg("#ECEAF5"),
  },
  fill: { height: "100%", borderRadius: 999 },
  line: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    color: C.body,
  },
  actions: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: tintBg("#F7F6FE"),
    padding: 12,
    gap: 8,
  },
  actionsTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  action: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  num: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontSize: 11, fontWeight: "700", color: Colors.onPrimary },
  actionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    color: C.body,
  },
  gain: { fontSize: 13, fontWeight: "700", color: tintFg("#1D9E75") },
}));
