import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  newAnalyseRowId,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import {
  Card,
  ErrorText,
  Hint,
  MoneyField,
  PremiumDueFields,
  PremiumField,
  RemoveX,
  SectionTitle,
  SecondaryButton,
  UpperTextFormField,
  YearSelect,
  YesNoQuestion,
  formStyles,
  usePersistField,
} from "./fields";
import { deriveHasVehicle, resolveVehicleToggle } from "./formState";

export function Step5Insurance() {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<AnalyseFormValues>();
  const {
    fields: otherInsuranceFields,
    append: appendOtherInsurance,
    remove: removeOtherInsurance,
  } = useFieldArray({ control, name: "otherInsurancePremiums" });

  const policyRefs = useRef<Record<string, TextInput | null>>({});
  const prevOtherLen = useRef(otherInsuranceFields.length);
  useEffect(() => {
    const prev = prevOtherLen.current;
    prevOtherLen.current = otherInsuranceFields.length;
    if (otherInsuranceFields.length <= prev) return;
    const last = otherInsuranceFields[otherInsuranceFields.length - 1];
    if (!last) return;
    const t = setTimeout(() => policyRefs.current[last.id]?.focus(), 80);
    return () => clearTimeout(t);
  }, [otherInsuranceFields]);

  const persistValue = usePersistField();

  const hasHealthInsurance = watch("hasHealthInsurance");
  const hasTermInsurance = watch("hasTermInsurance");
  const hasOtherInsurance = watch("hasOtherInsurance");
  // Screen-local answer so "Yes" can open the section before any number exists;
  // never persisted, so on revisit the section follows the numbers again.
  const [vehicleAnswer, setVehicleAnswer] = useState<boolean | null>(null);
  const hasCarInForm = resolveVehicleToggle(
    vehicleAnswer,
    deriveHasVehicle(watch()),
  );

  const otherRootError =
    errors.otherInsurancePremiums?.message ??
    errors.otherInsurancePremiums?.root?.message;

  return (
    <View style={formStyles.stepWrap}>
      <Card>
        <YesNoQuestion
          question="Do you have health insurance?"
          value={!!hasHealthInsurance}
          onChange={(yes) => setValue("hasHealthInsurance", yes)}
        />
        {hasHealthInsurance ? (
          <>
            <MoneyField name="healthInsuranceSumInsured" label="Sum insured" />
            <PremiumField
              label="Premium amount"
              amountError={errors.healthInsurancePremiumInput?.message}
              frequency={watch("healthInsurancePremiumFrequency") ?? "monthly"}
              onFrequencyChange={(v) =>
                setValue("healthInsurancePremiumFrequency", v)
              }
            >
              <MoneyField
                name="healthInsurancePremiumInput"
                label="Premium amount"
                hideLabel
              />
            </PremiumField>
            {(watch("healthInsurancePremiumInput") ?? 0) > 0 ? (
              <PremiumDueFields
                frequency={
                  watch("healthInsurancePremiumFrequency") ?? "monthly"
                }
                month={watch("healthInsuranceRenewalMonth") || undefined}
                day={watch("healthInsuranceRenewalDay") || undefined}
                onMonth={(m) => persistValue("healthInsuranceRenewalMonth", m)}
                onDay={(d) => persistValue("healthInsuranceRenewalDay", d)}
                monthName="healthInsuranceRenewalMonth"
                dayName="healthInsuranceRenewalDay"
                yearlyLabel="When is your health insurance renewal? (optional)"
                monthlyLabel="Which date is the health premium debited? (optional)"
              />
            ) : null}
          </>
        ) : null}
      </Card>

      <Card>
        <YesNoQuestion
          question="Do you have term insurance?"
          value={!!hasTermInsurance}
          onChange={(yes) => setValue("hasTermInsurance", yes)}
        />
        {hasTermInsurance ? (
          <>
            <MoneyField name="termInsuranceSumAssured" label="Sum assured" />
            <PremiumField
              label="Premium amount"
              amountError={errors.termInsurancePremiumInput?.message}
              frequency={watch("termInsurancePremiumFrequency") ?? "monthly"}
              onFrequencyChange={(v) =>
                setValue("termInsurancePremiumFrequency", v)
              }
            >
              <MoneyField
                name="termInsurancePremiumInput"
                label="Premium amount"
                hideLabel
              />
            </PremiumField>
            <YearSelect
              label="Premium paying till year (optional)"
              helper="Which year does your term end?"
              value={watch("termInsurancePremiumTillYear") || 0}
              onChange={(year) =>
                persistValue("termInsurancePremiumTillYear", year)
              }
              name="termInsurancePremiumTillYear"
              minYear={2024}
              maxYear={2060}
            />
            {(watch("termInsurancePremiumInput") ?? 0) > 0 ? (
              <PremiumDueFields
                frequency={watch("termInsurancePremiumFrequency") ?? "monthly"}
                month={watch("termInsuranceRenewalMonth") || undefined}
                day={watch("termInsuranceRenewalDay") || undefined}
                onMonth={(m) => persistValue("termInsuranceRenewalMonth", m)}
                onDay={(d) => persistValue("termInsuranceRenewalDay", d)}
                monthName="termInsuranceRenewalMonth"
                dayName="termInsuranceRenewalDay"
                hint="Optional renewal reminder — calendar day/month when premium is due, not health waiting-period days"
                yearlyLabel="Term premium renewal month & day (optional)"
                monthlyLabel="Term premium debit date each month (optional)"
              />
            ) : null}
          </>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Vehicle insurance</SectionTitle>
        <YesNoQuestion
          question="Do you have a vehicle?"
          value={hasCarInForm}
          onChange={(next) => {
            setVehicleAnswer(next);
            if (!next) {
              setValue("carInsurancePremiumInput", 0);
              setValue("bikeInsurancePremiumInput", 0);
            }
          }}
        />
        {hasCarInForm ? (
          <>
            <PremiumField
              label="Car insurance premium"
              amountError={errors.carInsurancePremiumInput?.message}
              frequency={watch("carInsurancePremiumFrequency") ?? "monthly"}
              onFrequencyChange={(v) =>
                setValue("carInsurancePremiumFrequency", v)
              }
            >
              <MoneyField
                name="carInsurancePremiumInput"
                label="Car insurance premium"
                hideLabel
              />
            </PremiumField>
            {(watch("carInsurancePremiumInput") ?? 0) > 0 ? (
              <PremiumDueFields
                frequency={watch("carInsurancePremiumFrequency") ?? "monthly"}
                month={watch("carInsuranceRenewalMonth") || undefined}
                day={watch("carInsuranceRenewalDay") || undefined}
                onMonth={(m) => persistValue("carInsuranceRenewalMonth", m)}
                onDay={(d) => persistValue("carInsuranceRenewalDay", d)}
                monthName="carInsuranceRenewalMonth"
                dayName="carInsuranceRenewalDay"
                yearlyLabel="When is your car insurance renewal? (optional)"
                monthlyLabel="Which date is the car premium debited? (optional)"
              />
            ) : null}
            <PremiumField
              label="Two-wheeler insurance premium"
              amountError={errors.bikeInsurancePremiumInput?.message}
              frequency={watch("bikeInsurancePremiumFrequency") ?? "monthly"}
              onFrequencyChange={(v) =>
                setValue("bikeInsurancePremiumFrequency", v)
              }
            >
              <MoneyField
                name="bikeInsurancePremiumInput"
                label="Two-wheeler insurance premium"
                hideLabel
              />
            </PremiumField>
            {(watch("bikeInsurancePremiumInput") ?? 0) > 0 ? (
              <PremiumDueFields
                frequency={watch("bikeInsurancePremiumFrequency") ?? "monthly"}
                month={watch("bikeInsuranceRenewalMonth") || undefined}
                day={watch("bikeInsuranceRenewalDay") || undefined}
                onMonth={(m) => persistValue("bikeInsuranceRenewalMonth", m)}
                onDay={(d) => persistValue("bikeInsuranceRenewalDay", d)}
                monthName="bikeInsuranceRenewalMonth"
                dayName="bikeInsuranceRenewalDay"
                yearlyLabel="When is your two-wheeler insurance renewal? (optional)"
                monthlyLabel="Which date is the two-wheeler premium debited? (optional)"
              />
            ) : null}
          </>
        ) : null}
      </Card>

      <Card>
        <YesNoQuestion
          question="Any other insurance premium?"
          value={!!hasOtherInsurance}
          onChange={(yes) => setValue("hasOtherInsurance", yes)}
        />
        {hasOtherInsurance ? (
          <View style={{ gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={[formStyles.rowTitle, { flex: 1 }]}>
                Add LIC / endowment / ULIP premiums
              </Text>
              <SecondaryButton
                label="Add"
                disabled={otherInsuranceFields.length >= 6}
                onPress={() =>
                  appendOtherInsurance({
                    id: newAnalyseRowId(),
                    policyName: "",
                    premiumAmount: 0,
                    frequency: "monthly",
                    maturityAmount: 0,
                    maturityYear: 0,
                  })
                }
              />
            </View>
            <ErrorText message={otherRootError} />
            {otherInsuranceFields.map((field, index) => {
              const freq =
                watch(`otherInsurancePremiums.${index}.frequency` as const) ??
                "monthly";
              return (
                <Card key={field.id}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: -8,
                      marginRight: -10,
                    }}
                  >
                    <Text style={formStyles.rowTitle}>
                      Other insurance premium {index + 1}
                    </Text>
                    <RemoveX onPress={() => removeOtherInsurance(index)} />
                  </View>
                  <UpperTextFormField
                    name={`otherInsurancePremiums.${index}.policyName` as const}
                    label="Policy name"
                    placeholder="LIC / endowment / ULIP / other"
                    inputRef={(node) => {
                      policyRefs.current[field.id] = node;
                    }}
                  />
                  <PremiumField
                    label="Premium amount"
                    amountError={
                      errors.otherInsurancePremiums?.[index]?.premiumAmount
                        ?.message
                    }
                    frequency={freq}
                    onFrequencyChange={(v) =>
                      setValue(
                        `otherInsurancePremiums.${index}.frequency` as const,
                        v,
                      )
                    }
                  >
                    <MoneyField
                      name={
                        `otherInsurancePremiums.${index}.premiumAmount` as const
                      }
                      label="Premium amount"
                      hideLabel
                    />
                  </PremiumField>
                  {(watch(
                    `otherInsurancePremiums.${index}.premiumAmount` as const,
                  ) ?? 0) > 0 ? (
                    <PremiumDueFields
                      frequency={freq}
                      month={
                        watch(
                          `otherInsurancePremiums.${index}.renewalMonth` as const,
                        ) || undefined
                      }
                      day={
                        watch(
                          `otherInsurancePremiums.${index}.renewalDay` as const,
                        ) || undefined
                      }
                      onMonth={(m) =>
                        persistValue(
                          `otherInsurancePremiums.${index}.renewalMonth` as const,
                          m,
                        )
                      }
                      onDay={(d) =>
                        persistValue(
                          `otherInsurancePremiums.${index}.renewalDay` as const,
                          d,
                        )
                      }
                      monthName={`otherInsurancePremiums.${index}.renewalMonth`}
                      dayName={`otherInsurancePremiums.${index}.renewalDay`}
                    />
                  ) : null}
                  <MoneyField
                    name={
                      `otherInsurancePremiums.${index}.maturityAmount` as const
                    }
                    label="Maturity amount (if any)"
                    helper="Amount you receive at maturity"
                  />
                  <YearSelect
                    label="Maturity year (optional)"
                    helper="Year this policy pays the maturity amount"
                    value={
                      watch(
                        `otherInsurancePremiums.${index}.maturityYear` as const,
                      ) || 0
                    }
                    onChange={(year) =>
                      persistValue(
                        `otherInsurancePremiums.${index}.maturityYear` as const,
                        year,
                      )
                    }
                    minYear={new Date().getFullYear()}
                    maxYear={2060}
                    name={`otherInsurancePremiums.${index}.maturityYear`}
                  />
                  <YesNoQuestion
                    question="LIC / endowment with a maturity value?"
                    sub="Yes counts this premium under Investment, not insurance."
                    value={
                      !!watch(
                        `otherInsurancePremiums.${index}.countAsInvestment` as const,
                      )
                    }
                    onChange={(yes) =>
                      persistValue(
                        `otherInsurancePremiums.${index}.countAsInvestment` as const,
                        yes,
                      )
                    }
                  />
                  <Hint tone="warn">
                    ⚠️ If this is a ULIP or endowment plan, the fix plan will
                    suggest comparing with a pure term plan.
                  </Hint>
                </Card>
              );
            })}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
