import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Colors, FontSize, Spacing, themedStyles } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  CATEGORIES,
  findCategoryForCalc,
  type Cat,
} from "@/constants/calculator-config";

const TAB_PAD = 120;

function openCalculator(id: string) {
  router.push(`/calculators/${id}` as Href);
}

export default function CalculatorsScreen() {
  const params = useLocalSearchParams<{ tool?: string }>();
  const [category, setCategory] = useState<Cat>("investment");

  // Home quick tools / drawer deep-link here with `?tool=<id>`; open that
  // calculator's screen on top of the hub, then clear the param so Back lands
  // on the hub and tapping the same tile again re-opens it.
  useEffect(() => {
    const tool = typeof params.tool === "string" ? params.tool : "";
    if (!tool) return;
    setCategory(findCategoryForCalc(tool));
    router.setParams({ tool: "" });
    openCalculator(tool);
  }, [params.tool]);

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  );

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Calculators</Text>
        <Text style={styles.sub}>
          Sliders update results instantly — illustrative, not advice.
        </Text>
        <Text style={styles.seoNote}>
          Includes SIP calculator India, EMI calculator, and income tax planning
          tools.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.catChip, on && styles.catChipOn]}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${c.label}`}
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.catLabel}>{activeCat.label}</Text>
        {activeCat.items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => openCalculator(item.id)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={styles.cardIcon}>
              <AppIcon
                name={item.icon ?? "trending"}
                size={20}
                color={Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.blurb}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.card },
  pad: { padding: Spacing.xl, paddingBottom: TAB_PAD },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  seoNote: {
    marginTop: 10,
    marginBottom: Spacing.lg,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  catRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: Spacing.md,
  },
  catChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.surfaceMuted,
  },
  catChipOn: {
    backgroundColor: Colors.primary,
  },
  catChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  catChipTextOn: {
    color: Colors.onPrimary,
  },
  catLabel: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  cardDesc: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
}));
