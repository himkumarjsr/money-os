import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  POST_OFFICE_SCHEME_LABELS,
  POST_OFFICE_SCHEME_VALUES,
  newAnalyseRowId,
  type AnalyseFormValues,
  type PostOfficeSchemeId,
} from "@/lib/analyse-form-schema";
import { Colors } from "@/constants/theme";
import {
  Card,
  ClampNumberField,
  DashedButton,
  DayOfMonthPicker,
  Hint,
  MoneyField,
  Note,
  RemoveX,
  SectionTitle,
  SecondaryButton,
  SelectField,
  TotalPanel,
  UpperTextFormField,
  YearSelect,
  YesNoQuestion,
  formStyles,
  usePersistField,
} from "./fields";
import {
  CUSTOM_INVESTMENT_TYPE_OPTIONS,
  formatCurrencyINR,
  mergeHelpers,
  type StepProps,
} from "./shared";

type CustomInvestmentType = NonNullable<
  AnalyseFormValues["customInvestments"]
>[number]["type"];

const SCHEME_OPTIONS = POST_OFFICE_SCHEME_VALUES.map((id) => ({
  value: id,
  label: POST_OFFICE_SCHEME_LABELS[id],
}));

const INVESTMENT_CACHE_HELPER = "Investment cache";

export function Step6Assets({ live }: Pick<StepProps, "live">) {
  const { control, watch, setValue } = useFormContext<AnalyseFormValues>();
  const persistValue = usePersistField();
  const [liquidMfInfoOpen, setLiquidMfInfoOpen] = useState(false);
  const {
    fields: customInvestmentFields,
    append: appendCustomInvestment,
    remove: removeCustomInvestment,
  } = useFieldArray({ control, name: "customInvestments" });
  const {
    fields: postOfficeSchemeFields,
    append: appendPostOfficeScheme,
    remove: removePostOfficeScheme,
  } = useFieldArray({ control, name: "postOfficeSchemes" });

  const ownsHome = watch("ownsHome");
  const ownsCar = watch("ownsCar");
  const hasPostOfficeSchemes = watch("hasPostOfficeSchemes");
  const nowYear = new Date().getFullYear();

  return (
    <View style={formStyles.stepWrap}>
      <View style={formStyles.group}>
        <SectionTitle>Cash and liquid assets</SectionTitle>
        <MoneyField name="fdValue" label="Fixed Deposit total value" />
        <ClampNumberField
          label="FD interest rate % (optional)"
          value={watch("fdRate") || 0}
          onChange={(val) => setValue("fdRate", val)}
          name="fdRate"
          placeholder="e.g. 7.1"
          suffix="%"
          min={0}
          max={15}
          helper="Check your FD certificate"
        />
        <YearSelect
          label="Tenure (maturity year)"
          helper="Year your FD matures"
          value={watch("fdMaturityYear") || 0}
          onChange={(year) => {
            const now = new Date().getFullYear();
            if (year >= now) setValue("fdTenureYears", year - now);
            persistValue("fdMaturityYear", year);
          }}
          minYear={nowYear}
          maxYear={2060}
          name="fdMaturityYear"
        />
        <Hint tone="info">
          💡 RBI insures max ₹5 lakh per depositor per bank. Keep FD in multiple
          banks if total exceeds ₹5 lakh.
        </Hint>
        {(watch("fdValue") ?? 0) > 500000 ? (
          <Hint tone="warn">
            ⚠️ Your FD exceeds ₹5 lakh. Only ₹5 lakh is insured by RBI per bank.
            Consider spreading across banks.
          </Hint>
        ) : null}
        <Text style={formStyles.small}>
          FD counts as 70% of emergency fund value due to premature break
          penalty
        </Text>
      </View>

      <Card style={{ gap: 20 }}>
        <View>
          <Text style={styles.cardHeading}>EMERGENCY FUND</Text>
          <Text style={[formStyles.body, { marginTop: 4 }]}>
            Money you can access within 48 hours without penalty
          </Text>
        </View>

        <MoneyField
          name="savingsAccountBalance"
          label="Savings account (instantly available)"
        />

        <View style={{ gap: 8 }}>
          <MoneyField name="liquidMFValue" label="Liquid mutual funds" />
          <Text style={styles.teal}>
            Liquid MFs give 6.5-7% returns. Withdraw in 24 hours. Better than
            FD.
          </Text>
          <Pressable
            onPress={() => setLiquidMfInfoOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: liquidMfInfoOpen }}
            style={styles.linkBtn}
          >
            <Text style={styles.link}>
              What is a liquid mutual fund? {liquidMfInfoOpen ? "▲" : "▼"}
            </Text>
          </Pressable>
          {liquidMfInfoOpen ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                A liquid mutual fund invests in government securities and bonds.
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoStrong}>Returns:</Text> 6.5-7% per year
                {"\n"}vs Savings account: 3-4%{"\n"}vs FD: 6.5% but with penalty
                if broken
              </Text>
              <Text style={[styles.infoText, styles.infoStrong]}>
                Why better than FD for emergency:
              </Text>
              <Text style={styles.infoText}>
                {
                  "•  No penalty to withdraw\n•  Money in account within 24 hours\n•  Same or slightly lower returns\n•  Can invest ₹500 minimum"
                }
              </Text>
              <Text style={[styles.infoText, styles.infoStrong]}>
                Good options to consider:
              </Text>
              <Text style={styles.infoText}>
                {
                  "•  SBI Liquid Fund\n•  HDFC Liquid Fund\n•  Parag Parikh Liquid Fund"
                }
              </Text>
              <Text style={formStyles.small}>
                This is not investment advice. Please research before investing.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fdBox}>
          <Text style={styles.fdTitle}>Fixed deposits (breakable)</Text>
          <Text style={formStyles.body}>
            Same as &quot;Fixed Deposit total value&quot; above — enter it once.
            We weight FD at 70% as emergency money (penalty + time to break).
          </Text>
          <Text style={[formStyles.body, { color: "#1E293B" }]}>
            Your FD of {formatCurrencyINR(live.erFd)} counts as{" "}
            {formatCurrencyINR(live.erFdCounted)} (70% after premature break
            penalty).
          </Text>
        </View>

        <MoneyField
          name="otherLiquidSavings"
          label="Other liquid savings"
          helper="Gold ETF, short term bonds, money market funds"
        />

        <MoneyField
          name="medicalEmergencyFund"
          label="Medical emergency fund"
          helper="Cash set aside only for medical use — separate from the general emergency pot above. Suggested minimum about ₹2–3 lakh depending on city and family. Used in your report checklist."
          optional
        />

        <View style={styles.erPanel}>
          <Text style={formStyles.rowTitle}>
            Your accessible emergency fund
          </Text>
          <View style={{ gap: 6, marginTop: 12 }}>
            <ErRow
              label="Savings"
              text={`${formatCurrencyINR(live.erSavings)} × 100% = ${formatCurrencyINR(live.erSavingsCounted)}`}
            />
            <ErRow
              label="Liquid MF"
              text={`${formatCurrencyINR(live.erLiq)} × 95% = ${formatCurrencyINR(live.erLiqCounted)}`}
            />
            <ErRow
              label="FD"
              text={`${formatCurrencyINR(live.erFd)} × 70% = ${formatCurrencyINR(live.erFdCounted)}`}
            />
            <ErRow
              label="Other"
              text={`${formatCurrencyINR(live.erOther)} × 50% = ${formatCurrencyINR(live.erOtherCounted)}`}
            />
          </View>
          <View style={styles.divider} />
          <Text style={styles.erTotal}>
            Real emergency fund: {formatCurrencyINR(live.erTotal)}
          </Text>
          <Text style={[styles.erMonths, { color: live.erMonthsColor }]}>
            {live.monthlyNeedsForEmergency > 0
              ? `This covers ${live.erMonths.toFixed(1)} months of expenses`
              : "Add living and fixed expenses to see months covered"}
          </Text>
        </View>
      </Card>

      <Card>
        <SectionTitle>Bereavement / demise fund</SectionTitle>
        <Text style={formStyles.body}>
          Liquid money for last rites, travel, and immediate expenses — not
          invested. Many families keep at least ₹2L aside; adjust to what feels
          right for your family.
        </Text>
        <MoneyField
          name="bereavementFund"
          label="Amount set aside (savings / FD you can break quickly)"
        />
      </Card>

      <View style={formStyles.group}>
        <SectionTitle>Investments</SectionTitle>
        <Card>
          <Text style={styles.cardSub}>Retirement investments</Text>
          <MoneyField
            name="ppfBalance"
            label="PPF current balance"
            helper="PPF balance — Existing investment cache"
          />
          <MoneyField
            name="npsBalance"
            label="NPS current balance"
            helper="NPS balance — Existing investment cache"
          />
          <MoneyField
            name="epfBalance"
            label="EPF / PF current balance"
            helper="EPF / PF balance — Existing investment cache"
          />
          <MoneyField
            name="monthlySIP"
            label="Monthly SIP / investment"
            helper={`${INVESTMENT_CACHE_HELPER} · Long term`}
          />
          {(watch("monthlySIP") ?? 0) > 0 ? (
            <DayOfMonthPicker
              label="Which date is your SIP auto-debited? (optional)"
              value={watch("sipAutoDebitDay") || undefined}
              onChange={(day) => persistValue("sipAutoDebitDay", day)}
              dayName="sipAutoDebitDay"
            />
          ) : null}
          {(watch("monthlyPPFContribution") ?? 0) > 0 ||
          (watch("ppfBalance") ?? 0) > 0 ? (
            <DayOfMonthPicker
              label="Which date do you deposit to PPF? (optional)"
              value={watch("ppfDepositDay") || undefined}
              onChange={(day) => persistValue("ppfDepositDay", day)}
              dayName="ppfDepositDay"
            />
          ) : null}
        </Card>
        <Card>
          <Text style={styles.cardSub}>Market investments</Text>
          <MoneyField
            name="totalEquityValue"
            label="Total equity investments"
            helper="Mutual funds + Indian stocks + US stocks + RSU/ESOPs"
          />
        </Card>
        <Card style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardSub, { flex: 1 }]}>
              Custom investments
            </Text>
            <SecondaryButton
              label="Add other investment +"
              disabled={customInvestmentFields.length >= 5}
              onPress={() =>
                appendCustomInvestment({
                  label: "",
                  currentValue: 0,
                  monthlyContribution: 0,
                  type: "other",
                })
              }
            />
          </View>
          {customInvestmentFields.map((field, index) => (
            <View key={field.id} style={styles.innerCard}>
              <UpperTextFormField
                name={`customInvestments.${index}.label` as const}
                label="Investment name"
              />
              <SelectField<CustomInvestmentType>
                label="Type"
                value={
                  watch(`customInvestments.${index}.type` as const) ?? "other"
                }
                options={CUSTOM_INVESTMENT_TYPE_OPTIONS}
                onChange={(v) => {
                  if (v)
                    setValue(`customInvestments.${index}.type` as const, v);
                }}
                name={`customInvestments.${index}.type`}
              />
              <MoneyField
                name={`customInvestments.${index}.currentValue` as const}
                label="Current value"
              />
              <MoneyField
                name={`customInvestments.${index}.monthlyContribution` as const}
                label="Monthly contribution"
              />
              <Pressable
                onPress={() => removeCustomInvestment(index)}
                accessibilityRole="button"
                style={styles.linkBtn}
              >
                <Text style={styles.removeText}>× Remove</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      </View>

      <View style={formStyles.group}>
        <SectionTitle>Physical assets</SectionTitle>
        <Card>
          <YesNoQuestion
            question="Do you own a home?"
            value={!!ownsHome}
            onChange={(yes) => setValue("ownsHome", yes)}
          />
          {ownsHome ? (
            <>
              <MoneyField name="homeMarketValue" label="Current market value" />
              <MoneyField
                name="homeLoanOutstanding"
                label="Outstanding home loan"
              />
              <MoneyField
                name="homeLoanEMI"
                label="Home loan EMI (monthly)"
                helper="If you have a home loan, enter the EMI you pay each month"
              />
              {(watch("homeLoanEMI") ?? 0) > 0 ||
              (watch("homeLoanOutstanding") ?? 0) > 0 ? (
                <DayOfMonthPicker
                  label="Which date is your home loan EMI debited? (optional)"
                  value={watch("homeLoanEMIDay") || undefined}
                  month={watch("homeLoanEMIMonth") || undefined}
                  onMonth={(m) => persistValue("homeLoanEMIMonth", m)}
                  onChange={(day) => persistValue("homeLoanEMIDay", day)}
                  monthName="homeLoanEMIMonth"
                  dayName="homeLoanEMIDay"
                />
              ) : null}
            </>
          ) : null}
        </Card>

        <Card>
          <YesNoQuestion
            question="Do you own a car?"
            value={!!ownsCar}
            onChange={(yes) => setValue("ownsCar", yes)}
          />
          {ownsCar ? (
            <>
              <MoneyField name="carMarketValue" label="Current market value" />
              <MoneyField
                name="carLoanOutstanding"
                label="Outstanding car loan"
              />
            </>
          ) : null}
        </Card>

        <MoneyField
          name="goldValue"
          label="Gold and jewellery estimated value"
        />
        <MoneyField name="otherAssets" label="Any other property or asset" />
        <UpperTextFormField
          name="otherAssetLabel"
          label="What is the other asset?"
        />
      </View>

      <View style={formStyles.group}>
        <SectionTitle>Ongoing savings / investments</SectionTitle>
        <MoneyField
          name="monthlyRD"
          label="Monthly RD amount currently running"
          helper="RD — Investment cache · Emergency / short term"
        />
        <MoneyField
          name="monthlyPPFContribution"
          label="Monthly PPF contribution"
          helper="PPF — Tax-free long term savings"
        />
        <MoneyField
          name="monthlyNPSContribution"
          label="Monthly NPS contribution"
          helper="NPS — Investment cache · Retirement"
        />
        <MoneyField
          name="monthlyEPFContribution"
          label="Monthly EPF contribution — employee side only"
          helper="EPF — Retirement deduction already reflected in take-home salary"
        />
        {live.hasEligibleGirlChild ? (
          <MoneyField
            name="ssy"
            label="Monthly SSY deposit (girl child under 10)"
            helper={mergeHelpers(
              "Sukanya Samriddhi — open before she turns 10",
              "Max ₹1,50,000/year",
              "Matures when girl turns 21",
              "Interest rate 8.2% p.a.",
              "SSY — Investment cache · Girl child · 8.2% guaranteed",
            )}
          />
        ) : null}

        <Card style={{ gap: 12 }}>
          <YesNoQuestion
            question="Do you have any India Post / post office savings schemes?"
            sub="NSC, KVP, MIS, SCSS, RD, time deposits, and similar — holdings count toward net worth."
            value={!!hasPostOfficeSchemes}
            onChange={(next) => {
              setValue("hasPostOfficeSchemes", next, { shouldDirty: true });
              if (next && postOfficeSchemeFields.length === 0) {
                appendPostOfficeScheme({
                  id: newAnalyseRowId(),
                  scheme: "nsc",
                  amount: 0,
                  maturityYear: undefined,
                });
              }
              if (!next) {
                setValue("postOfficeSchemes", []);
                setValue("investsInNsc", false);
                setValue("nscDepositAmount", 0);
              }
            }}
          />
          {hasPostOfficeSchemes ? (
            <View style={{ gap: 16 }}>
              {postOfficeSchemeFields.map((field, index) => (
                <View key={field.id} style={styles.innerCard}>
                  <View
                    style={[
                      styles.rowBetween,
                      { marginTop: -8, marginRight: -10 },
                    ]}
                  >
                    <Text style={formStyles.rowTitle}>Scheme {index + 1}</Text>
                    <RemoveX onPress={() => removePostOfficeScheme(index)} />
                  </View>
                  <SelectField<PostOfficeSchemeId>
                    label="Scheme type"
                    value={
                      watch(`postOfficeSchemes.${index}.scheme` as const) ||
                      "nsc"
                    }
                    options={SCHEME_OPTIONS}
                    onChange={(v) => {
                      if (!v) return;
                      setValue(
                        `postOfficeSchemes.${index}.scheme` as const,
                        v,
                        {
                          shouldDirty: true,
                        },
                      );
                    }}
                    name={`postOfficeSchemes.${index}.scheme`}
                  />
                  <MoneyField
                    name={`postOfficeSchemes.${index}.amount` as const}
                    label="Current holding / deposit"
                    helper="Principal or balance you hold today"
                  />
                  <YearSelect
                    label="Maturity year (optional)"
                    helper="From your certificate or passbook"
                    value={
                      watch(
                        `postOfficeSchemes.${index}.maturityYear` as const,
                      ) || 0
                    }
                    onChange={(year) =>
                      persistValue(
                        `postOfficeSchemes.${index}.maturityYear` as const,
                        year,
                      )
                    }
                    minYear={nowYear}
                    maxYear={2060}
                    name={`postOfficeSchemes.${index}.maturityYear`}
                  />
                </View>
              ))}
              <DashedButton
                label="+ Add another scheme"
                onPress={() =>
                  appendPostOfficeScheme({
                    id: newAnalyseRowId(),
                    scheme: "nsc",
                    amount: 0,
                    maturityYear: undefined,
                  })
                }
              />
            </View>
          ) : null}
        </Card>
      </View>

      {live.investmentsEmpty ? (
        <Note>
          Adding your existing investments gives you a more accurate net worth
          and analysis.
        </Note>
      ) : null}
      <TotalPanel
        label="Estimated net worth"
        amount={live.estimatedNetWorth}
        wordsAmount={Math.abs(live.estimatedNetWorth)}
      />
    </View>
  );
}

function ErRow({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.erRow}>
      <Text style={styles.erRowText}>{label}</Text>
      <Text style={[styles.erRowText, { flexShrink: 1, textAlign: "right" }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#0F172A",
  },
  cardSub: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  teal: { fontSize: 12, lineHeight: 17, color: "#0D9488" },
  linkBtn: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  infoBox: {
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
  },
  infoText: { fontSize: 14, lineHeight: 21, color: "#334155" },
  infoStrong: { fontWeight: "600", color: "#1E293B" },
  fdBox: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  fdTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  erPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FAFAFE",
    padding: 16,
  },
  erRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  erRowText: { fontSize: 14, color: "#334155" },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  erTotal: { fontSize: 22, fontWeight: "700", color: Colors.primary },
  erMonths: { marginTop: 8, fontSize: 14, fontWeight: "600" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  innerCard: {
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  removeText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
});
