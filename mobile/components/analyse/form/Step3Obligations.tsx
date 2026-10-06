import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  clearLegacyLoanScalars,
  newAnalyseRowId,
  type AnalyseFormValues,
  type UnifiedLoanType,
} from "@/lib/analyse-form-schema";
import { useFinancialStore } from "@/store/financialStore";
import { formatIndian, formatInWords } from "@/lib/formatters";
import { Colors } from "@/constants/theme";
import {
  Card,
  ClampNumberField,
  DashedButton,
  DayOfMonthPicker,
  MoneyField,
  Note,
  RemoveX,
  SectionTitle,
  SelectField,
  UpperTextFormField,
  YesNoQuestion,
  formStyles,
} from "./fields";
import { LOAN_TYPE_OPTIONS, type StepProps } from "./shared";

export function Step3Obligations({ live, ui, patchUi }: StepProps) {
  const { control, watch, setValue, getValues } =
    useFormContext<AnalyseFormValues>();
  const setAnalysis = useFinancialStore((st) => st.setAnalysis);
  const {
    fields: unifiedLoanFields,
    append: appendUnifiedLoan,
    remove: removeUnifiedLoan,
  } = useFieldArray({ control, name: "unifiedLoans" });

  const syncLoansToStore = useCallback(
    (loans: AnalyseFormValues["unifiedLoans"]) => {
      const activeLoans = (loans ?? []).filter(
        (row) => Number(row?.monthlyEMI ?? 0) > 0,
      );
      const patch: Partial<AnalyseFormValues> = { unifiedLoans: loans ?? [] };
      if (activeLoans.length === 0) {
        Object.assign(patch, clearLegacyLoanScalars());
        patchUi({ hasLoans: false });
      }
      setAnalysis({ ...getValues(), ...patch });
    },
    [getValues, setAnalysis, patchUi],
  );

  const removeUnifiedLoanAt = useCallback(
    (index: number, fieldId: string) => {
      patchUi({ savedLoanIds: ui.savedLoanIds.filter((id) => id !== fieldId) });
      removeUnifiedLoan(index);
      const remaining = getValues().unifiedLoans ?? [];
      syncLoansToStore(remaining);
    },
    [getValues, removeUnifiedLoan, syncLoansToStore, patchUi, ui.savedLoanIds],
  );

  const { totalIncome, fixedObligations } = live;
  const obligationsBg =
    totalIncome > 0 && fixedObligations > totalIncome * 0.5
      ? "#FEF2F2"
      : totalIncome > 0 && fixedObligations > totalIncome * 0.35
        ? "#FFFBEB"
        : "#ECFDF5";

  return (
    <View style={formStyles.stepWrap}>
      <View style={formStyles.group}>
        <SectionTitle>Housing</SectionTitle>
        <Card>
          <YesNoQuestion
            question="Are you on rent?"
            value={ui.isRenting}
            onChange={(next) => {
              patchUi({ isRenting: next });
              if (!next) {
                setValue("rentAmount", 0);
                setValue("rentMaintenanceMonthly", 0);
              }
            }}
          />
          {ui.isRenting ? (
            <View style={styles.indented}>
              <MoneyField
                name="rentAmount"
                label="Rent you pay monthly"
                helper="Enter your monthly rent if you live in a rented house. If you have a home loan (own house), enter 0 here — your EMI goes in the Loans section below."
              />
              <MoneyField
                name="rentMaintenanceMonthly"
                label="Flat maintenance"
                helper="Monthly society charges, maintenance, or similar on top of rent"
              />
            </View>
          ) : null}
        </Card>
        {live.housingNote ? (
          <Note tone={live.housingNote.tone}>{live.housingNote.text}</Note>
        ) : null}
      </View>

      <View style={formStyles.group}>
        <YesNoQuestion
          question="Do you have any loan EMIs?"
          value={ui.hasLoans}
          onChange={(next) => {
            patchUi(
              next ? { hasLoans: true } : { hasLoans: false, savedLoanIds: [] },
            );
            if (!next) {
              setValue("unifiedLoans", [], { shouldDirty: true });
              setAnalysis({
                ...getValues(),
                unifiedLoans: [],
                ...clearLegacyLoanScalars(),
              });
              setValue("homeLoanEMI", 0);
              setValue("personalLoanEMI", 0);
              setValue("carLoanEMI", 0);
              setValue("bikeEMI", 0);
            }
          }}
        />

        {ui.hasLoans ? (
          <>
            <SectionTitle>My loans</SectionTitle>
            <Text style={formStyles.muted13}>
              Add{" "}
              <Text style={styles.strong}>home loan</Text> here if you pay EMI
              on your residence or investment property, plus personal, car, PF,
              education, OD, or any other loan.
            </Text>

            <View style={{ gap: 12 }}>
              {unifiedLoanFields.map((field, index) => {
                const loanType = watch(
                  `unifiedLoans.${index}.loanType` as const,
                );
                const loanEmi =
                  watch(`unifiedLoans.${index}.monthlyEMI` as const) ?? 0;
                const loanOutstanding =
                  watch(`unifiedLoans.${index}.outstandingAmount` as const) ??
                  0;
                const loanLender =
                  watch(`unifiedLoans.${index}.lenderName` as const) || "";
                const typeLabel =
                  LOAN_TYPE_OPTIONS.find((o) => o.value === loanType)?.label ||
                  "Loan";
                const isSaved = ui.savedLoanIds.includes(field.id);
                const isOd = loanType === "overdraft";

                if (isSaved) {
                  return (
                    <View key={field.id} style={styles.savedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedTitle}>
                          {typeLabel}
                          {loanLender ? ` · ${loanLender}` : ""}
                        </Text>
                        <Text style={styles.savedAmounts}>
                          EMI ₹{Number(loanEmi).toLocaleString("en-IN")}
                          {loanOutstanding > 0
                            ? ` · Outstanding ₹${Number(loanOutstanding).toLocaleString("en-IN")}`
                            : ""}
                        </Text>
                        <Text style={styles.savedNote}>
                          Saved — add another loan below if needed
                        </Text>
                      </View>
                      <View style={styles.savedActions}>
                        <Pressable
                          onPress={() =>
                            patchUi({
                              savedLoanIds: ui.savedLoanIds.filter(
                                (id) => id !== field.id,
                              ),
                            })
                          }
                          accessibilityRole="button"
                          style={styles.editBtn}
                        >
                          <Text style={styles.editText}>Edit</Text>
                        </Pressable>
                        <RemoveX
                          label="Remove loan"
                          onPress={() => removeUnifiedLoanAt(index, field.id)}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={field.id} style={styles.loanCard}>
                    <View style={styles.loanHead}>
                      <Text style={styles.loanTitle}>Loan {index + 1}</Text>
                      <RemoveX
                        label="Remove loan"
                        onPress={() => removeUnifiedLoanAt(index, field.id)}
                      />
                    </View>

                    <SelectField<UnifiedLoanType>
                      label="Loan type *"
                      value={loanType ?? "personal_loan"}
                      options={LOAN_TYPE_OPTIONS}
                      placeholder="Select loan type"
                      onChange={(next) => {
                        if (!next) return;
                        setValue(
                          `unifiedLoans.${index}.loanType` as const,
                          next,
                          { shouldDirty: true },
                        );
                        setAnalysis(getValues());
                      }}
                    />
                    <UpperTextFormField
                      name={`unifiedLoans.${index}.lenderName` as const}
                      label="Lender name"
                      placeholder="e.g. HDFC, ICICI"
                    />

                    <MoneyField
                      name={`unifiedLoans.${index}.monthlyEMI` as const}
                      label="Monthly EMI *"
                      helper={
                        loanType === "home_loan"
                          ? "Enter your home loan EMI. This includes both principal and interest. Check your bank statement for the exact amount."
                          : "EMI you pay each month"
                      }
                    />
                    {loanEmi > 0 ? (
                      <DayOfMonthPicker
                        label="Which date is this EMI debited? (optional)"
                        hint="We'll remind you a few days before. Pick month and day only — no year."
                        value={
                          watch(`unifiedLoans.${index}.emiDay` as const) ||
                          undefined
                        }
                        month={
                          watch(`unifiedLoans.${index}.emiMonth` as const) ||
                          undefined
                        }
                        onMonth={(m) => {
                          setValue(
                            `unifiedLoans.${index}.emiMonth` as const,
                            m,
                            { shouldDirty: true },
                          );
                          setAnalysis(getValues());
                        }}
                        onChange={(day) => {
                          setValue(`unifiedLoans.${index}.emiDay` as const, day);
                          const lt = watch(
                            `unifiedLoans.${index}.loanType` as const,
                          );
                          if (lt === "home_loan") {
                            setValue("homeLoanEMIDay", day);
                          } else if (lt === "car_loan") {
                            setValue("carLoanEMIDay", day);
                          } else if (lt === "personal_loan") {
                            setValue("personalLoanEMIDay", day);
                          } else if (lt === "education_loan") {
                            setValue("educationLoanEMIDay", day);
                          }
                        }}
                      />
                    ) : null}
                    <MoneyField
                      name={`unifiedLoans.${index}.outstandingAmount` as const}
                      label={
                        isOd
                          ? "Amount currently used"
                          : "Outstanding amount (optional)"
                      }
                      helper={
                        isOd
                          ? "How much of your OD limit is drawn today — this drives your analysis"
                          : "Total principal still owed"
                      }
                      onValueChange={(next) => {
                        if (isOd) {
                          setValue(`unifiedLoans.${index}.odUsed` as const, next, {
                            shouldDirty: true,
                          });
                        }
                      }}
                    />

                    <ClampNumberField
                      label="Interest rate %"
                      value={
                        watch(`unifiedLoans.${index}.interestRate` as const) ||
                        0
                      }
                      onChange={(val) =>
                        setValue(
                          `unifiedLoans.${index}.interestRate` as const,
                          val,
                          { shouldDirty: true },
                        )
                      }
                      suffix="%"
                      placeholder="e.g. 14"
                      min={0}
                      max={50}
                      helper="From loan statement"
                    />
                    <ClampNumberField
                      label="Remaining months"
                      value={
                        watch(
                          `unifiedLoans.${index}.remainingMonths` as const,
                        ) || 0
                      }
                      onChange={(val) =>
                        setValue(
                          `unifiedLoans.${index}.remainingMonths` as const,
                          val,
                          { shouldDirty: true },
                        )
                      }
                      suffix="mo"
                      placeholder="e.g. 24"
                      min={0}
                      max={360}
                      helper="Months left to pay"
                    />

                    {isOd ? (
                      <View style={styles.indented}>
                        <MoneyField
                          name={`unifiedLoans.${index}.odLimit` as const}
                          label="OD limit"
                          helper="Maximum overdraft limit sanctioned by the bank"
                        />
                        <Text style={formStyles.small}>
                          Use{" "}
                          <Text style={styles.strong}>Outstanding amount</Text>{" "}
                          above for how much of the OD is currently used — that
                          value drives your analysis.
                        </Text>
                        <ClampNumberField
                          label="Interest-only period (years)"
                          value={
                            watch(
                              `unifiedLoans.${index}.odInterestOnlyYears` as const,
                            ) || 0
                          }
                          onChange={(val) =>
                            setValue(
                              `unifiedLoans.${index}.odInterestOnlyYears` as const,
                              val,
                              { shouldDirty: true },
                            )
                          }
                          suffix="yr"
                          placeholder="e.g. 2"
                          min={0}
                          max={10}
                          helper="Years before EMI starts"
                        />
                      </View>
                    ) : null}

                    <Pressable
                      disabled={!(loanEmi > 0)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !(loanEmi > 0) }}
                      onPress={() => {
                        if (!(loanEmi > 0)) return;
                        patchUi({
                          savedLoanIds: ui.savedLoanIds.includes(field.id)
                            ? ui.savedLoanIds
                            : [...ui.savedLoanIds, field.id],
                        });
                        if (loanType === "home_loan") {
                          setValue("homeLoanEMI", loanEmi, {
                            shouldDirty: true,
                          });
                          if (loanOutstanding > 0) {
                            setValue("homeLoanOutstanding", loanOutstanding, {
                              shouldDirty: true,
                            });
                          }
                        }
                        setAnalysis(getValues());
                      }}
                      style={[
                        styles.saveLoanBtn,
                        !(loanEmi > 0) && styles.saveLoanBtnOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.saveLoanText,
                          !(loanEmi > 0) && { color: Colors.textMuted },
                        ]}
                      >
                        Save this loan
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <DashedButton
              label="+ Add a loan"
              onPress={() =>
                appendUnifiedLoan({
                  id: newAnalyseRowId(),
                  loanType: "personal_loan",
                  lenderName: "",
                  monthlyEMI: 0,
                  outstandingAmount: 0,
                  interestRate: 0,
                  remainingMonths: 0,
                  odLimit: 0,
                  odUsed: 0,
                  odInterestOnlyYears: 0,
                })
              }
            />

            {unifiedLoanFields.length === 0 ? (
              <Text style={[formStyles.muted13, { textAlign: "center" }]}>
                No loans added. Click above to add personal loan, car loan, PF
                loan, etc.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={formStyles.group}>
        <YesNoQuestion
          question="Do you have credit card outstanding?"
          value={ui.hasCreditCardOutstanding}
          onChange={(next) => {
            patchUi({ hasCreditCardOutstanding: next });
            if (!next) setValue("creditCardBillMonthly", 0);
          }}
        />
        {ui.hasCreditCardOutstanding ? (
          <Card>
            <MoneyField
              name="creditCardBillMonthly"
              label="Credit card — typical monthly payment"
              helper="What you usually pay each month across cards (full pay-off or part of balance). Counts toward loan/debt pressure in your meter."
            />
            {(watch("creditCardBillMonthly") ?? 0) > 0 ? (
              <DayOfMonthPicker
                label="Which date is your credit-card bill usually due? (optional)"
                value={watch("creditCardBillDay") || undefined}
                onChange={(day) => setValue("creditCardBillDay", day)}
              />
            ) : null}
          </Card>
        ) : null}
      </View>

      {live.debtWarning ? <Note tone="red">{live.debtWarning}</Note> : null}
      <View style={[styles.obligationsPanel, { backgroundColor: obligationsBg }]}>
        <Text style={styles.obligationsLabel}>Total monthly obligations</Text>
        <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
          <Text style={styles.obligationsAmount}>
            ₹{formatIndian(fixedObligations)}
          </Text>
          <Text style={styles.obligationsWords}>
            {formatInWords(fixedObligations)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  indented: {
    gap: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 14,
  },
  strong: { fontWeight: "700", color: "#334155" },
  savedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  savedTitle: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  savedAmounts: { marginTop: 4, fontSize: 14, color: Colors.textPrimary },
  savedNote: { marginTop: 4, fontSize: 11, color: Colors.success },
  savedActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  editBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  loanCard: {
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  loanHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -8,
    marginRight: -10,
  },
  loanTitle: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  saveLoanBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLoanBtnOff: { backgroundColor: Colors.border },
  saveLoanText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  obligationsPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  obligationsLabel: { fontSize: 14, fontWeight: "500", color: "#334155" },
  obligationsAmount: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  obligationsWords: { fontSize: 11, color: "#64748B", textAlign: "right" },
});
