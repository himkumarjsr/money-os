/** Native port of components/learn/tax/TaxRegimeToggle.tsx. */
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";

type Example = {
  salary: number;
  notes: string;
  oldLikelyBetterWhen: string[];
  newLikelyBetterWhen: string[];
};

const EXAMPLES: Example[] = [
  {
    salary: 500000,
    notes:
      "Near rebate thresholds, the final tax can flip with small deduction changes. Always compare after cess.",
    oldLikelyBetterWhen: [
      "You claim meaningful 80C/80D/HRA",
      "Your taxable income stays within rebate limits under old regime rules",
    ],
    newLikelyBetterWhen: [
      "You claim few deductions",
      "You prefer simpler compliance with fewer proofs",
    ],
  },
  {
    salary: 1000000,
    notes:
      "For many salaried employees, the decision depends on how much you legitimately claim in 80C, 80D, HRA, NPS, and home loan interest.",
    oldLikelyBetterWhen: [
      "You have rent + HRA and claim it properly",
      "You max 80C + 80D",
      "You claim home loan interest under 24(b)",
    ],
    newLikelyBetterWhen: [
      "Deductions are low",
      "You do not claim HRA / home loan benefits",
      "You want fewer moving parts",
    ],
  },
  {
    salary: 1500000,
    notes:
      "At higher incomes, surcharge bands and deduction caps matter. Compare full computation (not only slab rates).",
    oldLikelyBetterWhen: [
      "You have big eligible deductions/exemptions",
      "You have home loan interest + NPS and you can claim both",
    ],
    newLikelyBetterWhen: [
      "Your eligible deductions are limited",
      "You want predictable TDS without last-minute proof collection",
    ],
  },
  {
    salary: 2500000,
    notes:
      "At this level, always review surcharge and marginal relief. Any capital gains should be computed separately from salary slabs.",
    oldLikelyBetterWhen: [
      "You have substantial eligible deductions (within caps)",
      "You can document claims cleanly (rent receipts, loan certificates, etc.)",
    ],
    newLikelyBetterWhen: [
      "You prefer fewer deductions and simpler filing",
      "Your income is mostly salary without large exemption proofs",
    ],
  },
];

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxTitle}>{title}</Text>
      <View style={{ gap: 6, marginTop: 10 }}>
        {items.map((t) => (
          <View key={t} style={styles.li}>
            <Text style={styles.liText}>•</Text>
            <Text style={[styles.liText, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TaxRegimeToggle() {
  const [salary, setSalary] = useState(EXAMPLES[1].salary);
  const ex = useMemo(
    () => EXAMPLES.find((e) => e.salary === salary) ?? EXAMPLES[0],
    [salary],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h2}>
        Old vs New regime — quick decision helper (FY 2025-26)
      </Text>
      <Text style={styles.sub}>
        This is an educational guide. For the exact tax number, use the
        calculator and verify with current Finance Act rules.
      </Text>
      <Pressable
        onPress={() => openContentHref("/calculators?calc=tax-regime")}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>Open tax regime calculator →</Text>
      </Pressable>

      <Text style={styles.pickLabel}>Pick a salary example</Text>
      <View style={styles.chips}>
        {EXAMPLES.map((e) => {
          const active = e.salary === salary;
          return (
            <Pressable
              key={e.salary}
              onPress={() => setSalary(e.salary)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {formatINR(e.salary)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          <Text style={{ fontWeight: "700" }}>Note:</Text> {ex.notes}
        </Text>
      </View>

      <Bullets
        title="Old regime is often better if…"
        items={ex.oldLikelyBetterWhen}
      />
      <Bullets
        title="New regime is often better if…"
        items={ex.newLikelyBetterWhen}
      />

      <Text style={styles.more}>
        Want the full, detailed guide?{" "}
        <Text
          style={styles.moreLink}
          onPress={() =>
            openContentHref(
              "/learn/old-vs-new-tax-regime-which-saves-you-more-money",
            )
          }
          accessibilityRole="link"
        >
          Read “Old vs new tax regime” →
        </Text>
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    backgroundColor: Colors.card,
    padding: 18,
    gap: 12,
  },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  sub: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  cta: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  ctaText: { color: Colors.onPrimary, fontWeight: "700", fontSize: 14 },
  pickLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: Colors.borderIndigo,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  note: {
    borderWidth: 1,
    borderColor: Colors.warningLight,
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: 14,
  },
  noteText: { fontSize: 14, lineHeight: 21, color: Colors.warningText },
  box: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
  },
  boxTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  li: { flexDirection: "row", gap: 8 },
  liText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  more: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  moreLink: { color: Colors.primary, fontWeight: "700" },
}));
