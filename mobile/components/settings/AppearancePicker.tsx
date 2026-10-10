import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import { PREMIUM_STREAK_DAYS, PREMIUM_TOP_RANK } from "@/lib/premiumTheme";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, type ThemePreference } from "@/store/themeStore";

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Follows your phone" },
  { value: "light", label: "Light", hint: "Bright and clean" },
  { value: "dark", label: "Dark", hint: "Easy on the eyes" },
  { value: "premium", label: "Premium", hint: "Black and gold" },
];

/** Settings → Appearance. Premium is locked until the user earns it. */
export function AppearancePicker() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const preference = useThemeStore((s) => s.preference);
  const premium = useThemeStore((s) => s.premium);
  const setPreference = useThemeStore((s) => s.setPreference);
  const unlocked = premium?.unlocked ?? false;

  useEffect(() => {
    void useThemeStore.getState().refreshPremium(userId);
  }, [userId]);

  const choose = (value: ThemePreference) => {
    if (value === preference) return;
    if (value === "premium" && !unlocked) return;
    setPreference(value, "/settings");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {OPTIONS.map((o) => {
          const locked = o.value === "premium" && !unlocked;
          const selected = preference === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => choose(o.value)}
              disabled={locked}
              style={[
                styles.option,
                o.value === "premium" && styles.premiumOption,
                selected && styles.selected,
                locked && styles.locked,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: locked }}
              accessibilityLabel={`${o.label} theme${locked ? ", locked" : ""}`}
            >
              <View style={styles.optionHead}>
                <Text
                  style={[
                    styles.optionLabel,
                    o.value === "premium" && styles.premiumLabel,
                  ]}
                >
                  {o.label}
                </Text>
                {locked ? (
                  <AppIcon name="lock" size={14} color={Colors.textMuted} />
                ) : selected ? (
                  <AppIcon name="check" size={14} color={Colors.primary} />
                ) : null}
              </View>
              <Text style={styles.optionHint}>{o.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      {!unlocked ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>How to unlock Premium</Text>
          <Text style={styles.noteText}>
            Generate your report and keep a {PREMIUM_STREAK_DAYS}-day streak
            (about 3 months of daily use), or reach the top {PREMIUM_TOP_RANK}{" "}
            on the leaderboard.
          </Text>
          {premium ? (
            <Text style={styles.noteProgress}>
              {premium.hasReport ? "Report done" : "No report yet"} · Streak{" "}
              {premium.streakDays}/{PREMIUM_STREAK_DAYS} days
              {premium.rank != null ? ` · Rank #${premium.rank}` : ""}
            </Text>
          ) : !userId ? (
            <Text style={styles.noteProgress}>Sign in to track progress.</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.unlocked}>
          Premium unlocked. Thanks for sticking with Finkoin.
        </Text>
      )}
    </View>
  );
}

const PREMIUM_GOLD = "#D4AF37";

const styles = themedStyles(() => ({
  wrap: { gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 64,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    gap: 2,
  },
  premiumOption: {
    backgroundColor: "#141418",
    borderColor: "#4A3F1F",
  },
  selected: { borderColor: Colors.primary, borderWidth: 2 },
  locked: { opacity: 0.6 },
  optionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLabel: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  premiumLabel: { color: PREMIUM_GOLD },
  optionHint: { fontSize: 12, color: Colors.textMuted },
  note: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
    gap: 4,
  },
  noteTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  noteText: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  noteProgress: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  unlocked: { fontSize: 12, fontWeight: "600", color: Colors.accent },
}));
