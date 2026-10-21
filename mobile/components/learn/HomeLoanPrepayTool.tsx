/** Native port of components/learn/tools/HomeLoanPrepayEmbed.tsx. */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Input } from "@/components/ui/Input";
import { ContentBlocks } from "@/components/content/ContentBlocks";
import { Colors, themedStyles } from "@/constants/theme";
import { formatIndian } from "@/lib/formatters";

/** Simple reducing-balance EMI. */
function emi(principal: number, annualPct: number, months: number) {
  const r = annualPct / 100 / 12;
  if (months <= 0) return 0;
  if (r <= 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

function totalInterest(principal: number, months: number, monthlyEmi: number) {
  return Math.max(0, monthlyEmi * months - principal);
}

/**
 * After a lump-sum prepayment, either keep tenure and cut EMI,
 * or keep EMI and cut tenure.
 */
function comparePrepay(input: {
  outstanding: number;
  annualPct: number;
  remainingMonths: number;
  prepay: number;
}) {
  const { outstanding, annualPct, remainingMonths, prepay } = input;
  const principal = Math.max(0, outstanding - prepay);
  const currentEmi = emi(outstanding, annualPct, remainingMonths);

  const emiAfter = emi(principal, annualPct, remainingMonths);
  const interestCutEmi = totalInterest(principal, remainingMonths, emiAfter);

  // Binary search months for same EMI
  let lo = 1;
  let hi = remainingMonths;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (emi(principal, annualPct, mid) > currentEmi) lo = mid + 1;
    else hi = mid;
  }
  const monthsCutTenure = lo;
  const interestCutTenure = totalInterest(
    principal,
    monthsCutTenure,
    currentEmi,
  );
  const interestNoPrepay = totalInterest(
    outstanding,
    remainingMonths,
    currentEmi,
  );

  return {
    currentEmi,
    emiAfter,
    monthsCutTenure,
    interestSavedEmi: interestNoPrepay - interestCutEmi,
    interestSavedTenure: interestNoPrepay - interestCutTenure,
  };
}

function num(text: string, fallback: number): number {
  return Number(text) || fallback;
}

export function HomeLoanPrepayTool() {
  const [outstanding, setOutstanding] = useState("4500000");
  const [rate, setRate] = useState("8.5");
  const [yearsLeft, setYearsLeft] = useState("15");
  const [prepay, setPrepay] = useState("500000");

  const out = num(outstanding, 0);
  const years = num(yearsLeft, 1);
  const result = useMemo(
    () =>
      comparePrepay({
        outstanding: out,
        annualPct: num(rate, 0),
        remainingMonths: years * 12,
        prepay: Math.min(num(prepay, 0), out - 1),
      }),
    [out, rate, years, prepay],
  );

  const tenureWins = result.interestSavedTenure >= result.interestSavedEmi;

  return (
    <View
      style={styles.wrap}
      accessibilityLabel="Home loan prepayment calculator"
    >
      <View style={styles.head}>
        <Text style={styles.title}>Home loan prepayment calculator</Text>
        <Text style={styles.sub}>
          Should you reduce EMI or tenure? Target: home loan prepayment
          calculator.
        </Text>
      </View>

      <View style={styles.body}>
        <Input
          label="Outstanding principal (₹)"
          value={outstanding}
          onChangeText={setOutstanding}
          keyboardType="numeric"
        />
        <Input
          label="Prepayment amount (₹)"
          value={prepay}
          onChangeText={setPrepay}
          keyboardType="numeric"
        />
        <Input
          label="Interest rate (% p.a.)"
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
        />
        <Input
          label="Years left"
          value={yearsLeft}
          onChangeText={setYearsLeft}
          keyboardType="numeric"
        />

        <View style={[styles.option, !tenureWins && styles.optionOn]}>
          <Text style={styles.optionLabel}>OPTION A - REDUCE EMI</Text>
          <Text style={styles.optionMain}>
            New EMI ≈ ₹{formatIndian(Math.round(result.emiAfter))}
          </Text>
          <Text style={styles.optionSub}>
            Interest saved ≈ ₹
            {formatIndian(Math.round(result.interestSavedEmi))}
          </Text>
        </View>
        <View style={[styles.option, tenureWins && styles.optionOn]}>
          <Text style={styles.optionLabel}>OPTION B - CUT TENURE</Text>
          <Text style={styles.optionMain}>
            Tenure ≈ {result.monthsCutTenure} months (
            {(result.monthsCutTenure / 12).toFixed(1)} yrs)
          </Text>
          <Text style={styles.optionSub}>
            Interest saved ≈ ₹
            {formatIndian(Math.round(result.interestSavedTenure))}
          </Text>
        </View>

        <Text style={styles.verdict}>
          {tenureWins
            ? "Usually better: keep EMI, cut tenure - if cashflow allows."
            : "Reduce EMI if you need monthly breathing room."}
        </Text>
      </View>

      <View style={styles.foot}>
        <Text style={styles.footText}>
          Educational estimate - not investment advice. Know it. Fix it. Grow
          it.
        </Text>
        <ContentBlocks
          blocks={[
            {
              kind: "actions",
              tone: "grey",
              actions: [
                {
                  label: "Open EMI calculator →",
                  href: "/calculators/emi",
                  primary: true,
                },
                { label: "Full health check →", href: "/analyse" },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  head: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  sub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  body: { padding: 16, gap: 12 },
  option: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
  },
  optionOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  optionMain: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  optionSub: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  verdict: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  foot: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 12,
    gap: 8,
  },
  footText: { fontSize: 11, color: Colors.textMuted },
}));
