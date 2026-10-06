import { StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { shared } from "./shared";

type Props = { debts: any[]; debtStrategy?: string };

/** Payoff maths copied from the web page's inline debt card. */
function debtNumbers(debt: any) {
  const extraPayment = Number(debt.extraEMIRecommended || 0);
  const rateM = Number(debt.rate || debt.interestRate || 12) / 100 / 12;
  const outstanding = Number(debt.outstanding || debt.balance || 0);
  const currentEMI = Number(debt.emi || debt.monthlyEMI || 0);
  const totalPayment = currentEMI + extraPayment;
  let monthsNow =
    extraPayment > 0 && totalPayment > 0 && rateM > 0 && outstanding > 0
      ? Math.ceil(
          -Math.log(1 - (rateM * outstanding) / totalPayment) /
            Math.log(1 + rateM),
        )
      : Number(debt.monthsToClearWithExtra || 0);
  if (!Number.isFinite(monthsNow) || monthsNow < 0 || monthsNow > 600) {
    monthsNow = Number(debt.monthsToClearWithExtra || 0);
  }
  let monthsOriginal =
    currentEMI > 0 && rateM > 0 && outstanding > 0
      ? Math.ceil(
          -Math.log(1 - (rateM * outstanding) / currentEMI) /
            Math.log(1 + rateM),
        )
      : 0;
  if (
    !Number.isFinite(monthsOriginal) ||
    monthsOriginal < 0 ||
    monthsOriginal > 600
  ) {
    monthsOriginal = 0;
  }
  const monthsSaved = Math.max(0, monthsOriginal - monthsNow);
  const interestSaved = Math.round(
    extraPayment > 0
      ? Math.max(0, Number(debt.extraEMIRecommended || 0)) *
          Math.max(0, Number(debt.monthsToClearWithExtra || 0)) *
          0.35
      : 0,
  );
  return {
    extraPayment,
    outstanding,
    currentEMI,
    monthsNow,
    monthsSaved,
    interestSaved,
  };
}

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
          const n = debtNumbers(debt);
          const label =
            debt.displayName || debt.label || debt.name || debt.type;
          const cells: [string, string][] = [
            ["Outstanding", `₹${n.outstanding.toLocaleString("en-IN")}`],
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
                    {debt.rate || debt.interestRate || 0}% interest
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
                  </Text>
                  <Text style={styles.saveAmount}>
                    Save ₹{n.interestSaved.toLocaleString("en-IN")} (est.)
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.strategy}>
        {debtStrategy ||
          "Clear high-interest debt first, then roll freed EMI into the next debt."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FFFFFF",
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
  boxHeaderText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  debt: { paddingVertical: 14, paddingHorizontal: 16 },
  debtDivider: { borderBottomWidth: 1, borderBottomColor: "#F7F7F4" },
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
    backgroundColor: "#FCEBEB",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rateText: { color: "#E24B4A", fontSize: 10, fontWeight: "700" },
  grid: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    backgroundColor: "#F7F7F4",
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
    backgroundColor: "#E1F5EE",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 4,
  },
  saveText: { fontSize: 12, color: "#1D5C3A" },
  saveAmount: { fontSize: 12, fontWeight: "700", color: "#1D9E75" },
  strategy: {
    marginTop: 4,
    fontSize: 14,
    fontStyle: "italic",
    color: "#7A7871",
    lineHeight: 20,
  },
});
