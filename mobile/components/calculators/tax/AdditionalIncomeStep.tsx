import { View } from "react-native";
import { TEACH } from "@/lib/taxTeachContent";
import { OtherIncomeSections } from "./OtherIncomeSections";
import { SalaryExtrasSections } from "./SalaryExtrasSections";
import { StepCard } from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";

export function AdditionalIncomeStep({ s }: { s: TaxCalcState }) {
  return (
    <StepCard
      title="Step 3 · Additional income"
      teach={TEACH.sections.income}
      blurb="Enable each strip only when it applies — unused toggles stay closed so the worksheet stays readable."
    >
      <View style={{ marginTop: 16 }}>
        <SalaryExtrasSections s={s} />
        <OtherIncomeSections s={s} />
      </View>
    </StepCard>
  );
}
