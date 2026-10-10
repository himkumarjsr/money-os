import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles, tintBg } from "@/constants/theme";
import { STEPS } from "./shared";

/** 7 clickable step pills — jumping is not validation-gated (web behaviour). */
export function ProgressPills({
  step,
  onJump,
}: {
  step: number;
  onJump: (index: number) => void;
}) {
  return (
    <View style={styles.pillsRow} accessibilityRole="tablist">
      {STEPS.map((item, index) => {
        const filled = index <= step;
        const current = index === step;
        return (
          <Pressable
            key={item.short}
            onPress={() => onJump(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            accessibilityLabel={`Step ${index + 1}: ${item.title}`}
            style={styles.pillHit}
          >
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: filled ? Colors.primary : tintBg("#E2E8F0"),
                },
              ]}
            />
            <Text
              style={[styles.pillLabel, current && styles.pillLabelOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {item.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ResumeBanner({
  onResume,
  onStartFresh,
}: {
  onResume: () => void;
  onStartFresh: () => void;
}) {
  return (
    <View style={styles.banner}>
      <View>
        <Text style={styles.bannerTitle}>Continue where you left off</Text>
        <Text style={styles.bannerSub}>Your form data is saved locally</Text>
      </View>
      <View style={styles.bannerActions}>
        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryText}>Resume</Text>
        </Pressable>
        <Pressable
          onPress={onStartFresh}
          accessibilityRole="button"
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostText}>Start fresh</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Web's inline-mode "View report / Start fresh" pair shown when a result exists. */
export function ResumeOptionRow({
  onViewReport,
  onStartFresh,
}: {
  onViewReport: () => void;
  onStartFresh: () => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Pressable
        onPress={onViewReport}
        accessibilityRole="button"
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryText}>View report</Text>
      </Pressable>
      <Pressable
        onPress={onStartFresh}
        accessibilityRole="button"
        style={styles.ghostBtn}
      >
        <Text style={styles.ghostText}>Start fresh</Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  pillsRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  pillHit: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    gap: 6,
  },
  pill: { height: 8, borderRadius: 999 },
  pillLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textMuted,
    textAlign: "center",
  },
  pillLabelOn: { color: Colors.primary, fontWeight: "700" },
  banner: {
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryMedium,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: Colors.primaryDark },
  bannerSub: { marginTop: 2, fontSize: 12, color: Colors.primary },
  bannerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
  ghostBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { fontSize: 14, color: Colors.textMuted },
}));
