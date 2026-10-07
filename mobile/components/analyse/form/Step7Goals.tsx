import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFormContext } from "react-hook-form";
import {
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { Colors } from "@/constants/theme";
import {
  RISK_QUESTIONS,
  RISK_TOLERANCE_LABELS,
  scoreRiskTolerance,
} from "@/lib/riskProfile";
import {
  ClampNumberField,
  ErrorText,
  MoneyField,
  SectionTitle,
  formStyles,
} from "./fields";
import { formatCurrencyINR, type StepProps } from "./shared";

export function Step7Goals({ live }: Pick<StepProps, "live">) {
  const {
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<AnalyseFormValues>();
  const riskAnswers = watch("riskAnswers");
  const riskTolerance = scoreRiskTolerance(riskAnswers);
  const answerRisk = (qi: number, score: number) => {
    const next = [...(getValues("riskAnswers") ?? [])];
    while (next.length < RISK_QUESTIONS.length) next.push(null);
    next[qi] = score;
    setValue("riskAnswers", next, { shouldDirty: true });
  };
  const primaryGoal = watch("primaryGoal");
  const hasKids = watch("lifeStage") === "kids";

  return (
    <View style={formStyles.stepWrap}>
      <View style={formStyles.group}>
        <SectionTitle>Primary goal</SectionTitle>
        <View style={styles.grid}>
          {PRIMARY_GOAL_VALUES.map((value) => {
            const selected = primaryGoal === value;
            return (
              <Pressable
                key={value}
                onPress={() =>
                  setValue("primaryGoal", value, { shouldDirty: true })
                }
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.goalCard, selected && styles.goalCardOn]}
              >
                <Text style={styles.goalText}>
                  {PRIMARY_GOAL_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <ErrorText message={errors.primaryGoal?.message} />
      </View>

      <View style={formStyles.group}>
        <SectionTitle>Goal amounts and timelines</SectionTitle>
        {primaryGoal === "buy_home" ? (
          <>
            <MoneyField
              name="homePurchaseTarget"
              label="Home purchase target"
            />
            <ClampNumberField
              label="Target year"
              value={watch("homePurchaseYear") || 0}
              onChange={(val) => setValue("homePurchaseYear", Math.round(val))}
              placeholder="e.g. 2028"
              min={2024}
              max={2060}
              decimal={false}
              clampOnBlur
              name="homePurchaseYear"
            />
            <Text style={styles.purpleNote}>
              Rule: Save 60% as down payment first.
            </Text>
          </>
        ) : null}
        {primaryGoal === "retire_early" ? (
          <>
            <MoneyField
              name="retirementTargetCorpus"
              label="Retirement target corpus"
              helper={
                live.retirementYears !== undefined
                  ? `${live.retirementYears} years to retirement based on your current age.`
                  : undefined
              }
            />
            <ClampNumberField
              label="Target retirement age"
              value={watch("retirementAge") || 0}
              onChange={(val) => setValue("retirementAge", Math.round(val))}
              placeholder="e.g. 60"
              min={30}
              max={100}
              decimal={false}
              clampOnBlur
              name="retirementAge"
            />
          </>
        ) : null}
        {hasKids || primaryGoal === "kids_education" ? (
          <>
            <MoneyField
              name="kidsEducationFundTarget"
              label="Kids education fund target"
              required={hasKids}
            />
            {hasKids ? (
              <MoneyField
                name="kidsMarriageFundTarget"
                label="Kids marriage fund target"
              />
            ) : null}
            <Text style={styles.purpleNote}>
              Add per-child target if you have multiple kids.
            </Text>
          </>
        ) : null}
        {primaryGoal === "build_emergency_fund" ? (
          <MoneyField
            name="emergencyFundTarget"
            label="Emergency fund target"
            helper={
              live.emergencyFundSuggestion
                ? `Suggested: ${formatCurrencyINR(live.emergencyFundSuggestion)} — ${live.emergencyFundMonths} months of your monthly expenses and obligations, based on your life stage`
                : `We recommend ${live.emergencyFundMonths} months of expenses for your life stage — add expenses to see an amount`
            }
          />
        ) : null}
        {primaryGoal === "buy_car" ? (
          <>
            <MoneyField name="carPurchaseTarget" label="Car purchase target" />
            <ClampNumberField
              label="Target year"
              value={watch("carPurchaseYear") || 0}
              onChange={(val) => setValue("carPurchaseYear", Math.round(val))}
              placeholder="e.g. 2028"
              min={2024}
              max={2060}
              decimal={false}
              clampOnBlur
              name="carPurchaseYear"
            />
          </>
        ) : null}
        {primaryGoal === "clear_debt" ? (
          <Text style={styles.greyNote}>
            Your debt plan will be built from the loans you entered.
          </Text>
        ) : null}
        {primaryGoal === "grow_wealth" ? (
          <Text style={styles.greyNote}>
            FIRE number will be calculated from your expenses.
          </Text>
        ) : null}
        {primaryGoal === "build_insurance_premium_fund" ? (
          <Text style={styles.greyNote}>
            MIS + RD strategy will be calculated from your insurance premiums.
          </Text>
        ) : null}
      </View>

      <View style={formStyles.group}>
        <SectionTitle>How you handle risk</SectionTitle>
        {RISK_QUESTIONS.map((q, qi) => (
          <View key={q.id} style={{ gap: 8 }}>
            <Text style={styles.riskQuestion}>{q.question}</Text>
            {q.options.map((label, score) => {
              const selected = riskAnswers?.[qi] === score;
              return (
                <Pressable
                  key={label}
                  onPress={() => answerRisk(qi, score)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.riskOption, selected && styles.goalCardOn]}
                >
                  <Text style={styles.riskOptionText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={styles.greyNote}>
          {riskTolerance
            ? `Your risk profile: ${RISK_TOLERANCE_LABELS[riskTolerance]}. We use it to pick instruments for each goal.`
            : "Optional — answer all three and we'll match instruments to how you handle ups and downs."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  goalCard: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  goalCardOn: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(83,74,183,0.1)",
  },
  goalText: { fontSize: 15, fontWeight: "500", color: "#1E293B" },
  purpleNote: { fontSize: 12, color: Colors.primary },
  greyNote: { fontSize: 14, lineHeight: 20, color: "#7A7871" },
  riskQuestion: { fontSize: 14, fontWeight: "600", color: "#5F5E5A" },
  riskOption: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  riskOptionText: { fontSize: 15, fontWeight: "500", color: "#1E293B" },
});
