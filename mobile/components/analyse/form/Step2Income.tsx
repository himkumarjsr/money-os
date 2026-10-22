import { Text, View } from "react-native";
import { useFormContext } from "react-hook-form";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_VALUES,
  TAX_SLAB_OPTIONS,
  type AnalyseFormValues,
  type EmploymentType,
} from "@/lib/analyse-form-schema";
import {
  ClampNumberField,
  FieldLabel,
  MoneyField,
  Note,
  SegmentToggle,
  SelectField,
  TotalPanel,
  formStyles,
} from "./fields";
import type { StepProps } from "./shared";

export function Step2Income({ live }: Pick<StepProps, "live">) {
  const { watch, setValue } = useFormContext<AnalyseFormValues>();
  const lifeStage = watch("lifeStage");
  const stepUpPlanned = watch("sipStepUpPlanned");

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
      <View style={{ gap: 8 }}>
        <FieldLabel>How do you earn?</FieldLabel>
        <SegmentToggle<EmploymentType | "">
          options={EMPLOYMENT_TYPE_VALUES.map((value) => ({
            value,
            label: EMPLOYMENT_TYPE_LABELS[value],
          }))}
          value={watch("employmentType") ?? ""}
          onChange={(value) =>
            setValue("employmentType", value || undefined, {
              shouldDirty: true,
            })
          }
        />
        <Text style={formStyles.small}>
          Self-employed or business income can stop without notice, so we plan a
          bigger emergency fund.
        </Text>
      </View>
      <SelectField<number>
        label="Your income-tax slab"
        value={watch("taxSlabPct")}
        allowEmpty
        placeholder="Not sure - we'll work it out"
        options={TAX_SLAB_OPTIONS.map((pct) => ({
          value: pct,
          label: pct === 0 ? "No tax" : `${pct}%`,
        }))}
        onChange={(value) =>
          setValue("taxSlabPct", value, { shouldDirty: true })
        }
        helper="FD and debt fund interest is taxed at your slab, so we plan on what you keep after tax."
      />
      <View style={{ gap: 8 }}>
        <FieldLabel>Will you raise your SIPs every year?</FieldLabel>
        <SegmentToggle<"yes" | "no" | "">
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          value={
            stepUpPlanned === undefined ? "" : stepUpPlanned ? "yes" : "no"
          }
          onChange={(value) =>
            setValue("sipStepUpPlanned", value === "yes", {
              shouldDirty: true,
            })
          }
        />
        <Text style={formStyles.small}>
          Yes: we start smaller and raise them each April. No: one fixed amount.
        </Text>
      </View>
      <TotalPanel label="Total monthly income" amount={live.totalIncome} />
      {live.debtWarning ? <Note tone="red">{live.debtWarning}</Note> : null}
    </View>
  );
}
