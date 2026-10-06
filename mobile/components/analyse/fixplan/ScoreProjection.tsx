import { StyleSheet, Text, View } from "react-native";
import {
  noGainProjectionMessage,
  scoreProjectionGain,
} from "@/lib/fixPlanMerge";
import { Colors, Radius } from "@/constants/theme";
import { getScoreBg, getScoreColor } from "./shared";

function ScoreCircle({ label, score }: { label: string; score: number }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: getScoreBg(score),
            borderColor: getScoreColor(score),
          },
        ]}
      >
        <Text style={[styles.score, { color: getScoreColor(score) }]}>
          {score}
        </Text>
        <Text style={styles.outOf}>/100</Text>
      </View>
    </View>
  );
}

type Props = { plan: any };

export function ScoreProjection({ plan }: Props) {
  const scoreToday = Number(plan?.scoreToday || 0);
  const scoreAfter = Number(plan?.scoreAfter12Months || 0);
  const scoreGain = scoreProjectionGain(plan);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Score projection</Text>
      {scoreGain > 0 ? (
        <>
          <Text style={styles.sub}>Follow this plan for 12 months</Text>
          <View style={styles.row}>
            <ScoreCircle label="TODAY" score={scoreToday} />
            <View style={styles.middle}>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.gain}>+{scoreGain} pts</Text>
              <Text style={styles.months}>in 12 months</Text>
            </View>
            <ScoreCircle label="MONTH 12" score={scoreAfter} />
          </View>
        </>
      ) : (
        <View style={styles.steadyRow}>
          <View
            style={[
              styles.steadyCircle,
              {
                backgroundColor: getScoreBg(scoreToday),
                borderColor: getScoreColor(scoreToday),
              },
            ]}
          >
            <Text
              style={[styles.steadyScore, { color: getScoreColor(scoreToday) }]}
            >
              {scoreToday}
            </Text>
          </View>
          <Text style={styles.steadyText}>
            {noGainProjectionMessage(scoreToday)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: Colors.textMuted, marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  col: { alignItems: "center" },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  outOf: { fontSize: 10, color: Colors.textMuted },
  middle: { flex: 1, alignItems: "center" },
  arrow: { fontSize: 28, color: Colors.primary, lineHeight: 30 },
  gain: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.success,
    marginTop: 6,
  },
  months: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  steadyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  steadyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  steadyScore: { fontSize: 20, fontWeight: "800" },
  steadyText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#1D5C3A" },
});
