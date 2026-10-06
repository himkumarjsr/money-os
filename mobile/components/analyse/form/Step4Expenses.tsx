import { View } from "react-native";
import { useFormContext } from "react-hook-form";
import {
  CITY_TIER_LABELS,
  CITY_TIER_VALUES,
  type AnalyseFormValues,
  type CityTier,
} from "@/lib/analyse-form-schema";
import {
  Card,
  MoneyField,
  Note,
  SectionTitle,
  SelectField,
  TotalPanel,
  YesNoQuestion,
  formStyles,
} from "./fields";
import type { StepProps } from "./shared";

const CITY_OPTIONS = CITY_TIER_VALUES.map((value) => ({
  value,
  label: CITY_TIER_LABELS[value],
}));

export function Step4Expenses({ live }: Pick<StepProps, "live">) {
  const { watch, setValue } = useFormContext<AnalyseFormValues>();
  const lifeStage = watch("lifeStage");
  const parentsSupport = watch("parentsSupport") ?? 0;
  const hasParentsInsurance =
    (watch("parentsHealthInsuranceSumInsured") ?? 0) > 0;

  return (
    <View style={formStyles.stepWrap}>
      <View style={formStyles.group}>
        <SectionTitle>Food</SectionTitle>
        <MoneyField
          name="foodTotal"
          label="Food and daily essentials"
          helper="(groceries + vegetables + medicines + pharmacy) · Combined monthly spend on food and daily household items"
        />
      </View>
      <View style={formStyles.group}>
        <SectionTitle>Transport</SectionTitle>
        <MoneyField
          name="transportTotal"
          label="Transport"
          helper="(fuel + cab / auto / metro / bus)"
        />
      </View>
      <View style={formStyles.group}>
        <SectionTitle>Utilities</SectionTitle>
        <MoneyField
          name="utilityTotal"
          label="Utilities"
          helper="(electricity + internet + mobile + gas + water)"
        />
      </View>
      <View style={formStyles.group}>
        <SectionTitle>Domestic help</SectionTitle>
        <MoneyField
          name="domesticHelpTotal"
          label="Domestic help"
          helper="(maid + cook)"
        />
      </View>
      <View style={formStyles.group}>
        <SectionTitle>Lifestyle</SectionTitle>
        <MoneyField
          name="lifestyleTotal"
          label="Lifestyle and personal"
          helper="(dining out + OTT + shopping + salon + gym)"
        />
      </View>
      <View style={formStyles.group}>
        <SectionTitle>Family</SectionTitle>
        {lifeStage === "kids" ? (
          <>
            <MoneyField
              name="kidsSchoolFees"
              label="Kids school fees and tuition"
            />
            <MoneyField
              name="kidsActivities"
              label="Kids activities — sports, hobby classes"
            />
          </>
        ) : null}
        <MoneyField name="parentsSupport" label="Parents / in-laws support" />
      </View>

      {parentsSupport > 0 ? (
        <Card>
          <SectionTitle>Parents care details</SectionTitle>
          <SelectField<CityTier>
            label="Where do your parents reside?"
            value={watch("parentsCity")}
            options={CITY_OPTIONS}
            placeholder="Select"
            allowEmpty
            onChange={(v) => setValue("parentsCity", v)}
            name="parentsCity"
          />
          <Card>
            <YesNoQuestion
              question="Do your parents have health insurance?"
              value={hasParentsInsurance}
              onChange={(yes) =>
                setValue(
                  "parentsHealthInsuranceSumInsured",
                  yes
                    ? Math.max(
                        watch("parentsHealthInsuranceSumInsured") ?? 0,
                        5_00_000,
                      )
                    : 0,
                )
              }
            />
            {hasParentsInsurance ? (
              <MoneyField
                name="parentsHealthInsuranceSumInsured"
                label="Sum insured (₹)"
              />
            ) : null}
          </Card>
          <MoneyField
            name="parentsEmergencyCash"
            label="Liquid cash set aside specifically for parents medical needs (₹)"
            helper="Separate from your emergency fund. Senior medical costs can be sudden and large."
          />
        </Card>
      ) : null}

      {live.debtWarning ? <Note tone="red">{live.debtWarning}</Note> : null}
      <TotalPanel
        label="Total monthly expenses"
        amount={live.monthlyLivingExpenses}
      />
    </View>
  );
}
