import { View } from "react-native";
import { useFormContext } from "react-hook-form";
import type { AnalyseFormValues } from "@/lib/analyse-form-schema";
import {
  ClampNumberField,
  MoneyField,
  Note,
  TotalPanel,
  formStyles,
} from "./fields";
import type { StepProps } from "./shared";

export function Step2Income({ live }: Pick<StepProps, "live">) {
  const { watch, setValue } = useFormContext<AnalyseFormValues>();
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
        label="Other income - freelance, rental, business"
      />
      <ClampNumberField
        label="Expected yearly salary increase"
        value={watch("annualSalaryIncreasePct") || 0}
        onChange={(val) =>
          setValue("annualSalaryIncreasePct", val, { shouldDirty: true })
        }
        suffix="%"
        placeholder="e.g. 8"
        min={0}
        max={50}
        helper="Optional. Your goal SIPs can grow with your salary, so the starting amount is lower."
        name="annualSalaryIncreasePct"
      />
      <TotalPanel label="Total monthly income" amount={live.totalIncome} />
      {live.debtWarning ? <Note tone="red">{live.debtWarning}</Note> : null}
    </View>
  );
}
