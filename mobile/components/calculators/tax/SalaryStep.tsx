import { StyleSheet, Text, View } from "react-native";
import { TEACH } from "@/lib/taxTeachContent";
import { rupees } from "./format";
import {
  Checkbox,
  InfoBox,
  Mt,
  StepCard,
  TaxNumberInput,
  tx,
} from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";

export function SalaryStep({ s }: { s: TaxCalcState }) {
  const { i, update } = s;
  return (
    <StepCard
      title="Step 2 · Core salary income"
      teach={TEACH.sections.income}
      blurb="Enter current employer recurring payslip salary here — turn on Step 3 for HRA, job-switch / F&F, or side income."
    >
      <View style={styles.body}>
        <Text style={[tx.xsMuted, { marginBottom: 8 }]}>
          Annualised core salary (Basic + Special below; add Step 3 for HRA in
          salary) ≈ {rupees(s.salaryAnnualPreview)} before toggled buckets
          {i.secJobSwitch && i.prevEmployerSalaryAnnual > 0
            ? ` · + previous employer ${rupees(i.prevEmployerSalaryAnnual)}`
            : ""}
          .
        </Text>
        <Mt
          id="tax-basic-m"
          label={
            i.secJobSwitch
              ? "Current employer — basic salary (monthly)"
              : "Basic salary (monthly)"
          }
          teach={TEACH.income.basicMonthly}
          value={i.basicMonthly}
          max={10_000_000}
          onChange={(n) => update({ basicMonthly: n })}
        />
        <Mt
          id="tax-special-m"
          label={
            i.secJobSwitch
              ? "Current employer — special allowance (monthly)"
              : "Special allowance (monthly)"
          }
          teach={TEACH.income.allowancesMonthly}
          optional
          value={i.specialAllowanceMonthly}
          max={10_000_000}
          onChange={(n) => update({ specialAllowanceMonthly: n })}
        />
        <Mt
          id="tax-free"
          label="Freelance / professional income (annual)"
          teach={TEACH.income.freelanceIncome}
          optional
          value={i.freelanceIncome}
          max={500000000}
          onChange={(n) => update({ freelanceIncome: n })}
        />
        <Mt
          id="tax-meal-voucher-m"
          label="Meal card / coupon received (monthly)"
          teach={TEACH.income.allowancesMonthly}
          optional
          value={i.mealVoucherMonthly}
          max={200000}
          onChange={(n) => update({ mealVoucherMonthly: n })}
        />
        <TaxNumberInput
          label="Eligible meal days per month"
          value={i.mealVoucherWorkDaysPerMonth}
          onChange={(n) => update({ mealVoucherWorkDaysPerMonth: n })}
          min={0}
          max={31}
          step={1}
        />
        <Checkbox
          checked={i.mealVoucherUse200Cap}
          onChange={(v) => update({ mealVoucherUse200Cap: v })}
          label="Use revised cap ₹200/meal (turn off for older ₹50/meal rule)"
        />
        <InfoBox style={styles.gapTop}>
          Meal voucher exemption modelled yearly ≈ ₹
          {Math.round(s.mealVoucherAnnualExemption).toLocaleString("en-IN")}
        </InfoBox>
        <InfoBox style={styles.gapTop}>
          Core annual (Basic + Special only) ≈ ₹
          {Math.round(
            (i.basicMonthly + i.specialAllowanceMonthly) * 12,
          ).toLocaleString("en-IN")}
        </InfoBox>
      </View>
    </StepCard>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 16 },
  gapTop: { marginTop: 4 },
});
