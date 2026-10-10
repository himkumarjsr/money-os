import { Text, View } from "react-native";
import { debtPayoffNumbers } from "@/lib/priorityEngine";
import {
  DEBT_ESTIMATE_NOTE,
  debtIsEstimated,
  debtRateLabel,
  estSuffix,
} from "@/lib/fixPlanMerge";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import { shared } from "./shared";

type Props = { debts: any[]; debtStrategy?: string };

export function DebtStrategy({ debts, debtStrategy }: Props) {
  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Debt strategy</Text>
      <View style={styles.box}>
        <View style={styles.boxHeader}>
          <Text style={styles.boxHeaderText}>
            Debt Payoff Strategy (Avalanche Method)
          </Text>
        </View>
        {debts.map((debt, i) => {
          const n = debtPayoffNumbers(debt);
          const label =
            debt.displayName || debt.label || debt.name || debt.type;
          const cells: [string, string][] = [
            [
              "Outstanding",
              `₹${n.outstanding.toLocaleString("en-IN")}${debt.outstandingEstimated ? " (est.)" : ""}`,
            ],
            ["Current EMI", `₹${n.currentEMI.toLocaleString("en-IN")}/mo`],
            [
              "Extra payment",
              n.extraPayment > 0
                ? `₹${n.extraPayment.toLocaleString("en-IN")}/mo`
                : "After P1 cleared",
            ],
          ];
          return (
            <View
              key={`${debt.type}-${i}`}
              style={[styles.debt, i < debts.length - 1 && styles.debtDivider]}
            >
              <View style={styles.debtHeader}>
                <Text style={styles.debtLabel}>{label}</Text>
                <View style={styles.ratePill}>
                  <Text style={styles.rateText}>
                    {debt.rateEstimated
                      ? `${debtRateLabel(debt)} interest`
                      : `${debt.rate || debt.interestRate || 0}% interest`}
                  </Text>
                </View>
              </View>
              <View style={styles.grid}>
                {cells.map(([lbl, value]) => (
                  <View key={lbl} style={styles.cell}>
                    <Text style={styles.cellLabel}>{lbl}</Text>
                    <Text style={styles.cellValue}>{value}</Text>
                  </View>
                ))}
              </View>
              {n.extraPayment > 0 ? (
                <View style={styles.saveBox}>
                  <Text style={styles.saveText}>
                    Clear in {n.monthsNow || debt.monthsToClearWithExtra || 0}{" "}
                    months
                    {n.monthsSaved > 0
                      ? ` (save ${n.monthsSaved} months vs EMI-only)`
                      : ""}
                    {estSuffix(debt)}
                  </Text>
                  {n.interestSaved > 0 ? (
                    <Text style={styles.saveAmount}>
                      Save ₹{n.interestSaved.toLocaleString("en-IN")} interest
                      {estSuffix(debt)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      {debts.some(debtIsEstimated) ? (
        <Text style={styles.estimateNote}>{DEBT_ESTIMATE_NOTE}</Text>
      ) : null}
      <Text style={styles.strategy}>
        {debtStrategy ||
          "Clear high-interest debt first, then roll freed EMI into the next debt."}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  boxHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  boxHeaderText: { color: Colors.onPrimary, fontSize: 13, fontWeight: "700" },
  debt: { paddingVertical: 14, paddingHorizontal: 16 },
  debtDivider: { borderBottomWidth: 1, borderBottomColor: Colors.background },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  debtLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  ratePill: {
    backgroundColor: Colors.errorLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rateText: { color: Colors.error, fontSize: 10, fontWeight: "700" },
  grid: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  cellLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 3 },
  cellValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  saveBox: {
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 4,
  },
  saveText: { fontSize: 12, color: Colors.successText },
  saveAmount: { fontSize: 12, fontWeight: "700", color: Colors.success },
  estimateNote: {
    marginBottom: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.warningText,
  },
  strategy: {
    marginTop: 4,
    fontSize: 14,
    fontStyle: "italic",
    color: Colors.textMuted,
    lineHeight: 20,
  },
}));
