import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFormContext } from "react-hook-form";
import {
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { Colors } from "@/constants/theme";
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
    formState: { errors },
  } = useFormContext<AnalyseFormValues>();
  const primaryGoal = watch("primaryGoal");

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
                <Text style={styles.goalText}>{PRIMARY_GOAL_LABELS[value]}</Text>
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
            <MoneyField name="homePurchaseTarget" label="Home purchase target" />
            <ClampNumberField
              label="Target year"
              value={watch("homePurchaseYear") || 0}
              onChange={(val) => setValue("homePurchaseYear", Math.round(val))}
              placeholder="e.g. 2028"
              min={2024}
              max={2060}
              decimal={false}
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
            />
          </>
        ) : null}
        {primaryGoal === "kids_education" ? (
          <>
            <MoneyField
              name="kidsEducationFundTarget"
              label="Kids education fund target"
            />
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
                ? `Suggested baseline: ${formatCurrencyINR(live.emergencyFundSuggestion)}`
                : undefined
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
});
