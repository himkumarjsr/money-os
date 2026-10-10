import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { PO_RATES_PERIOD, PO_RATES_SOURCE } from "@/lib/postOfficeSchemes";
import { Insight, calcStyles } from "./calculator-ui";
import {
  PO_SCHEME_META,
  PoSchemeCalculator,
  type PoSchemeId,
} from "./postOffice/schemeCalculators";

function openCalculator(id: string) {
  router.push(`/calculators/${id}` as Href);
}

export function PostOfficeCalculator() {
  const [scheme, setScheme] = useState<PoSchemeId>("td");
  const active = PO_SCHEME_META.find((s) => s.id === scheme)!;

  return (
    <View style={calcStyles.stack}>
      <View>
        <Text style={styles.pickerLabel}>Choose a scheme</Text>
        <Text style={styles.pickerHint}>
          Rates notified for {PO_RATES_PERIOD}. Tap a scheme to open its
          calculator.
        </Text>
        <View style={styles.schemeGrid}>
          {PO_SCHEME_META.map((s) => {
            const selected = s.id === scheme;
            return (
              <Pressable
                key={s.id}
                onPress={() => setScheme(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${s.short}, ${s.name}, ${s.rateLabel}`}
                style={({ pressed }) => [
                  styles.schemeCard,
                  selected ? styles.schemeCardSelected : styles.schemeCardIdle,
                  pressed && !selected && styles.schemeCardPressed,
                ]}
              >
                <Text style={styles.schemeShort}>{s.short}</Text>
                <Text style={styles.schemeName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.schemeRate}>{s.rateLabel}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.activeCard}>
        <Text style={styles.activeTitle}>{active.name}</Text>
        <Text style={styles.activeHint}>
          Also available at{" "}
          <Text
            style={styles.activeLink}
            onPress={() => openCalculator(active.calcId)}
            accessibilityRole="link"
          >
            /calculators/{active.calcId}
          </Text>
        </Text>
        <View style={styles.activeBody}>
          <PoSchemeCalculator scheme={scheme} />
        </View>
      </View>

      <Insight tone="warn">
        {PO_RATES_SOURCE}. Always confirm the live rate and eligibility at India
        Post before investing.{" "}
        <Text
          style={styles.insightLink}
          onPress={() => openCalculator("ppf")}
          accessibilityRole="link"
        >
          PPF calculator
        </Text>{" "}
        is also available (notified {PO_RATES_PERIOD} rate applies when opened
        at a post office).
      </Insight>
    </View>
  );
}

export {
  PoKvpCalculator,
  PoMisCalculator,
  PoNscSchemeCalculator,
  PoRecurringDepositCalculator,
  PoSavingsCalculator,
  PoScssCalculator,
  PoSsyCalculator,
  PoTimeDepositCalculator,
} from "./postOffice/schemeCalculators";

const styles = themedStyles(() => ({
  pickerLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  pickerHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  schemeGrid: { marginTop: 12, gap: 8 },
  schemeCard: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  schemeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMuted,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  schemeCardIdle: { borderColor: Colors.border, backgroundColor: Colors.card },
  schemeCardPressed: { borderColor: "rgba(83,74,183,0.5)" },
  schemeShort: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  schemeName: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  schemeRate: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  activeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  activeTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  activeHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  activeLink: { fontWeight: "500", color: Colors.primary },
  activeBody: { marginTop: 16 },
  insightLink: { fontWeight: "600", textDecorationLine: "underline" },
}));
