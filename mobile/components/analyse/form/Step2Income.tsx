import { View } from "react-native";
import { useFormContext } from "react-hook-form";
import type { AnalyseFormValues } from "@/lib/analyse-form-schema";
import { MoneyField, Note, TotalPanel, formStyles } from "./fields";
import type { StepProps } from "./shared";

export function Step2Income({ live }: Pick<StepProps, "live">) {
  const { watch } = useFormContext<AnalyseFormValues>();
  const lifeStage = watch("lifeStage");

  return (
    <View style={[formStyles.stepWrap, { gap: 20 }]}>
      <MoneyField
        name="monthlySalary"
        label="Monthly take-home salary"
        required
      />
      {lifeStage !== "bachelor" ? (
        <MoneyField name="spouseIncome" label="Spouse monthly income" />
      ) : null}
      <MoneyField
        name="otherIncome"
        label="Other income — freelance, rental, business"
      />
      {live.debtWarning ? <Note tone="red">{live.debtWarning}</Note> : null}
      <TotalPanel label="Total monthly income" amount={live.totalIncome} />
    </View>
  );
}
