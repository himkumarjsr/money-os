import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { supabase } from "@/lib/supabase";
import { analyseFinances } from "@/lib/financialEngine";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { upsertUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { invalidateProfileMonthlySalaryCache } from "@/lib/trackerProfileIncome";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import MoneyInput from "@/components/ui/MoneyInput";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const TOTAL_STEPS = 7;

const LIFE_STAGES = [
  { value: "bachelor", label: "Single", emoji: "🧑" },
  { value: "married", label: "Married", emoji: "💑" },
  { value: "kids", label: "With Kids", emoji: "👨‍👩‍👧" },
  { value: "senior", label: "Senior", emoji: "🧓" },
] as const;

const CITY_TIERS = [
  {
    value: "metro",
    label: "Metro",
    sub: "Mumbai, Delhi, Bengaluru",
  },
  {
    value: "tier2",
    label: "Tier 2",
    sub: "Pune, Hyderabad, Ahmedabad",
  },
  {
    value: "tier3",
    label: "Tier 3",
    sub: "Smaller cities and towns",
  },
] as const;

const GOALS = [
  { value: "emergency_fund", label: "Build emergency fund", emoji: "🛡️" },
  { value: "buy_home", label: "Buy a home", emoji: "🏠" },
  { value: "retire_early", label: "Retire early", emoji: "🌴" },
  { value: "grow_wealth", label: "Grow wealth", emoji: "📈" },
  { value: "clear_debt", label: "Clear debt", emoji: "💳" },
  { value: "childs_education", label: "Child's education", emoji: "🎓" },
] as const;

type FormState = {
  lifeStage: string;
  selfAge: string;
  spouseAge: string;
  numberOfKids: string;
  cityTier: string;
  monthlySalary: string;
  spouseIncome: string;
  otherIncome: string;
  homeLoanEMI: string;
  carLoanEMI: string;
  personalLoanEMI: string;
  rentAmount: string;
  creditCardBillMonthly: string;
  foodTotal: string;
  transportTotal: string;
  utilityTotal: string;
  lifestyleTotal: string;
  hasHealthInsurance: boolean;
  healthInsuranceSumInsured: string;
  healthInsurancePremiumInput: string;
  healthInsurancePremiumFrequency: "monthly" | "yearly";
  hasTermInsurance: boolean;
  termInsuranceSumAssured: string;
  termInsurancePremiumInput: string;
  termInsurancePremiumFrequency: "monthly" | "yearly";
  savingsAccountBalance: string;
  fdValue: string;
  liquidMFValue: string;
  totalEquityValue: string;
  ppfBalance: string;
  epfBalance: string;
  monthlySIP: string;
  primaryGoal: string;
};

export default function AnalyseFormScreen() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    lifeStage: "bachelor",
    selfAge: "",
    spouseAge: "",
    numberOfKids: "",
    cityTier: "metro",
    monthlySalary: "",
    spouseIncome: "",
    otherIncome: "",
    homeLoanEMI: "",
    carLoanEMI: "",
    personalLoanEMI: "",
    rentAmount: "",
    creditCardBillMonthly: "",
    foodTotal: "",
    transportTotal: "",
    utilityTotal: "",
    lifestyleTotal: "",
    hasHealthInsurance: false,
    healthInsuranceSumInsured: "",
    healthInsurancePremiumInput: "",
    healthInsurancePremiumFrequency: "yearly",
    hasTermInsurance: false,
    termInsuranceSumAssured: "",
    termInsurancePremiumInput: "",
    termInsurancePremiumFrequency: "yearly",
    savingsAccountBalance: "",
    fdValue: "",
    liquidMFValue: "",
    totalEquityValue: "",
    ppfBalance: "",
    epfBalance: "",
    monthlySIP: "",
    primaryGoal: "grow_wealth",
  });

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else void handleSubmit();
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert(
        "Sign in required",
        "Please log in to save your health check.",
      );
      router.push("/(auth)/login");
      return;
    }
    setSaving(true);

    try {
      const num = (v: string) => {
        const n = Number(String(v).replace(/,/g, ""));
        return Number.isFinite(n) ? n : 0;
      };

      const payload = {
        ...analyseDefaultValues,
        lifeStage: form.lifeStage as "bachelor" | "married" | "kids" | "senior",
        selfAge: num(form.selfAge) || 28,
        spouseAge: num(form.spouseAge) || undefined,
        numberOfKids:
          form.lifeStage === "kids" ? num(form.numberOfKids) || 1 : undefined,
        cityTier: form.cityTier as "metro" | "tier2" | "tier3",
        monthlySalary: num(form.monthlySalary),
        spouseIncome: num(form.spouseIncome),
        otherIncome: num(form.otherIncome),
        homeLoanEMI: num(form.homeLoanEMI),
        carLoanEMI: num(form.carLoanEMI),
        personalLoanEMI: num(form.personalLoanEMI),
        rentAmount: num(form.rentAmount),
        creditCardBillMonthly: num(form.creditCardBillMonthly),
        foodTotal: num(form.foodTotal),
        transportTotal: num(form.transportTotal),
        utilityTotal: num(form.utilityTotal),
        lifestyleTotal: num(form.lifestyleTotal),
        hasHealthInsurance: form.hasHealthInsurance,
        healthInsuranceSumInsured: num(form.healthInsuranceSumInsured),
        healthInsurancePremiumInput: num(form.healthInsurancePremiumInput),
        healthInsurancePremiumFrequency: form.healthInsurancePremiumFrequency,
        hasTermInsurance: form.hasTermInsurance,
        termInsuranceSumAssured: num(form.termInsuranceSumAssured),
        termInsurancePremiumInput: num(form.termInsurancePremiumInput),
        termInsurancePremiumFrequency: form.termInsurancePremiumFrequency,
        savingsAccountBalance: num(form.savingsAccountBalance),
        fdValue: num(form.fdValue),
        liquidMFValue: num(form.liquidMFValue),
        totalEquityValue: num(form.totalEquityValue),
        ppfBalance: num(form.ppfBalance),
        epfBalance: num(form.epfBalance),
        monthlySIP: num(form.monthlySIP),
        primaryGoal: form.primaryGoal,
      };

      const normalized = normalizeAnalyseFormValues(payload as never);
      const analysisResult = analyseFinances(normalized);

      // Canonical store + snapshot (web parity — B1)
      useFinancialStore
        .getState()
        .hydrateFromSnapshot(normalized, analysisResult, {
          analysisPatch: payload as never,
        });

      const { error: snapErr } = await upsertUserAnalyseSnapshot(user.id, {
        profile: normalized,
        result: analysisResult,
        submittedAt: new Date().toISOString(),
        version: "1.0",
        analysis: payload as never,
      });
      if (snapErr) throw snapErr;

      // Legacy table kept for older clients / back-compat
      const { error } = await supabase.from("user_analysis").upsert(
        {
          user_id: user.id,
          profile: normalized,
          analysis_result: analysisResult,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      await invalidateProfileMonthlySalaryCache(user.id);

      router.replace("/(tabs)/analyse");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.stepInfo}>
          <Text style={styles.stepLabel}>
            Step {step} of {TOTAL_STEPS}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && <Step1Profile form={form} update={update} />}
          {step === 2 && <Step2Income form={form} update={update} />}
          {step === 3 && <Step3Loans form={form} update={update} />}
          {step === 4 && <Step4Expenses form={form} update={update} />}
          {step === 5 && <Step5Insurance form={form} update={update} />}
          {step === 6 && <Step6Assets form={form} update={update} />}
          {step === 7 && <Step7Goals form={form} update={update} />}

          <View style={styles.navButtons}>
            <Button
              label={step === TOTAL_STEPS ? "Get my score →" : "Next →"}
              onPress={next}
              loading={saving}
              style={{ marginTop: 24 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type StepProps = {
  form: FormState;
  update: (p: Partial<FormState>) => void;
};

function Step1Profile({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Tell us about yourself</Text>
      <Text style={stepStyles.sub}>
        This helps us calculate the right targets for you
      </Text>

      <Text style={stepStyles.fieldLabel}>Life stage</Text>
      <View style={stepStyles.chipGrid}>
        {LIFE_STAGES.map((s) => (
          <TouchableOpacity
            key={s.value}
            onPress={() => update({ lifeStage: s.value })}
            style={[
              stepStyles.chip,
              form.lifeStage === s.value && stepStyles.chipActive,
            ]}
          >
            <Text style={stepStyles.chipEmoji}>{s.emoji}</Text>
            <Text
              style={[
                stepStyles.chipLabel,
                form.lifeStage === s.value && stepStyles.chipLabelActive,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <Input
          label="Your age"
          value={form.selfAge}
          onChangeText={(v) => update({ selfAge: v })}
          keyboardType="numeric"
          placeholder="28"
        />
      </View>

      {(form.lifeStage === "married" || form.lifeStage === "kids") && (
        <View style={{ marginTop: 12 }}>
          <Input
            label="Spouse age"
            value={form.spouseAge}
            onChangeText={(v) => update({ spouseAge: v })}
            keyboardType="numeric"
            placeholder="26"
          />
        </View>
      )}

      {form.lifeStage === "kids" && (
        <View style={{ marginTop: 12 }}>
          <Input
            label="Number of kids"
            value={form.numberOfKids}
            onChangeText={(v) => update({ numberOfKids: v })}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>
      )}

      <Text style={[stepStyles.fieldLabel, { marginTop: 20 }]}>City tier</Text>
      {CITY_TIERS.map((tier) => (
        <TouchableOpacity
          key={tier.value}
          onPress={() => update({ cityTier: tier.value })}
          style={[
            stepStyles.tierCard,
            form.cityTier === tier.value && stepStyles.tierCardActive,
          ]}
        >
          <View
            style={[
              stepStyles.tierDot,
              form.cityTier === tier.value && stepStyles.tierDotActive,
            ]}
          />
          <View>
            <Text
              style={[
                stepStyles.tierLabel,
                form.cityTier === tier.value && stepStyles.tierLabelActive,
              ]}
            >
              {tier.label}
            </Text>
            <Text style={stepStyles.tierSub}>{tier.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Step2Income({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Your income</Text>
      <Text style={stepStyles.sub}>Monthly take-home salary (after tax)</Text>

      <MoneyInput
        label="Monthly salary"
        value={form.monthlySalary}
        onChange={(v) => update({ monthlySalary: v })}
        helper="Your take-home after all deductions"
      />

      {(form.lifeStage === "married" || form.lifeStage === "kids") && (
        <View style={{ marginTop: 16 }}>
          <MoneyInput
            label="Spouse income (optional)"
            value={form.spouseIncome}
            onChange={(v) => update({ spouseIncome: v })}
          />
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <MoneyInput
          label="Other income (optional)"
          value={form.otherIncome}
          onChange={(v) => update({ otherIncome: v })}
          helper="Freelance, rental, business etc"
        />
      </View>
    </View>
  );
}

function Step3Loans({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Loans and rent</Text>
      <Text style={stepStyles.sub}>Monthly outgoing payments</Text>

      <MoneyInput
        label="Home loan EMI (if any)"
        value={form.homeLoanEMI}
        onChange={(v) => update({ homeLoanEMI: v })}
      />
      <View style={{ marginTop: 12 }}>
        <MoneyInput
          label="Car loan EMI (if any)"
          value={form.carLoanEMI}
          onChange={(v) => update({ carLoanEMI: v })}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <MoneyInput
          label="Personal loan EMI (if any)"
          value={form.personalLoanEMI}
          onChange={(v) => update({ personalLoanEMI: v })}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <MoneyInput
          label="Monthly rent (if renting)"
          value={form.rentAmount}
          onChange={(v) => update({ rentAmount: v })}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <MoneyInput
          label="Credit card bill (monthly)"
          value={form.creditCardBillMonthly}
          onChange={(v) => update({ creditCardBillMonthly: v })}
        />
      </View>
    </View>
  );
}

function Step4Expenses({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Monthly expenses</Text>
      <Text style={stepStyles.sub}>Approximate monthly spending</Text>

      {(
        [
          ["foodTotal", "Food and groceries", "🍽️"],
          ["transportTotal", "Transport", "🚕"],
          ["utilityTotal", "Utilities and bills", "⚡"],
          ["lifestyleTotal", "Lifestyle and personal", "🎉"],
        ] as const
      ).map(([key, label, emoji]) => (
        <View key={key} style={{ marginTop: 12 }}>
          <MoneyInput
            label={`${emoji} ${label}`}
            value={form[key]}
            onChange={(v) => update({ [key]: v })}
          />
        </View>
      ))}
    </View>
  );
}

function Step5Insurance({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Insurance</Text>
      <Text style={stepStyles.sub}>Your current insurance cover</Text>

      <TouchableOpacity
        onPress={() => update({ hasHealthInsurance: !form.hasHealthInsurance })}
        style={[
          stepStyles.toggleCard,
          form.hasHealthInsurance && stepStyles.toggleCardActive,
        ]}
      >
        <Text style={stepStyles.toggleEmoji}>🏥</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              stepStyles.toggleLabel,
              form.hasHealthInsurance && stepStyles.toggleLabelActive,
            ]}
          >
            Health Insurance
          </Text>
          <Text style={stepStyles.toggleSub}>Individual or family floater</Text>
        </View>
        <View
          style={[
            stepStyles.checkbox,
            form.hasHealthInsurance && stepStyles.checkboxActive,
          ]}
        >
          {form.hasHealthInsurance ? (
            <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {form.hasHealthInsurance ? (
        <View style={stepStyles.subFields}>
          <MoneyInput
            label="Sum insured"
            value={form.healthInsuranceSumInsured}
            onChange={(v) => update({ healthInsuranceSumInsured: v })}
            helper="Total cover amount (e.g. 500000 for ₹5L)"
          />
          <View style={{ marginTop: 12 }}>
            <MoneyInput
              label="Premium paid"
              value={form.healthInsurancePremiumInput}
              onChange={(v) => update({ healthInsurancePremiumInput: v })}
            />
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={() => update({ hasTermInsurance: !form.hasTermInsurance })}
        style={[
          stepStyles.toggleCard,
          form.hasTermInsurance && stepStyles.toggleCardActive,
          { marginTop: 12 },
        ]}
      >
        <Text style={stepStyles.toggleEmoji}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              stepStyles.toggleLabel,
              form.hasTermInsurance && stepStyles.toggleLabelActive,
            ]}
          >
            Term Life Insurance
          </Text>
          <Text style={stepStyles.toggleSub}>Pure protection plan</Text>
        </View>
        <View
          style={[
            stepStyles.checkbox,
            form.hasTermInsurance && stepStyles.checkboxActive,
          ]}
        >
          {form.hasTermInsurance ? (
            <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {form.hasTermInsurance ? (
        <View style={stepStyles.subFields}>
          <MoneyInput
            label="Sum assured"
            value={form.termInsuranceSumAssured}
            onChange={(v) => update({ termInsuranceSumAssured: v })}
            helper="Total life cover"
          />
          <View style={{ marginTop: 12 }}>
            <MoneyInput
              label="Annual premium"
              value={form.termInsurancePremiumInput}
              onChange={(v) => update({ termInsurancePremiumInput: v })}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Step6Assets({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Assets and savings</Text>
      <Text style={stepStyles.sub}>Current value of what you own</Text>

      {(
        [
          ["savingsAccountBalance", "Savings account balance", "🏦"],
          ["fdValue", "Fixed deposits (FD)", "📜"],
          ["liquidMFValue", "Liquid mutual funds", "💧"],
          ["totalEquityValue", "Equity (MF + stocks + ESOP)", "📈"],
          ["ppfBalance", "PPF balance", "💰"],
          ["epfBalance", "EPF balance", "🏢"],
          ["monthlySIP", "Monthly SIP", "🔄"],
        ] as const
      ).map(([key, label, emoji]) => (
        <View key={key} style={{ marginTop: 12 }}>
          <MoneyInput
            label={`${emoji} ${label}`}
            value={form[key]}
            onChange={(v) => update({ [key]: v })}
          />
        </View>
      ))}
    </View>
  );
}

function Step7Goals({ form, update }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>Your primary goal</Text>
      <Text style={stepStyles.sub}>What matters most to you right now?</Text>

      <View style={stepStyles.goalGrid}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.value}
            onPress={() => update({ primaryGoal: g.value })}
            style={[
              stepStyles.goalCard,
              form.primaryGoal === g.value && stepStyles.goalCardActive,
            ]}
          >
            <Text style={stepStyles.goalEmoji}>{g.emoji}</Text>
            <Text
              style={[
                stepStyles.goalLabel,
                form.primaryGoal === g.value && stepStyles.goalLabelActive,
              ]}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backText: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
  },
  stepInfo: { flex: 1, gap: 6 },
  stepLabel: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.xl,
  },
  navButtons: {
    marginTop: Spacing.md,
  },
});

const stepStyles = StyleSheet.create({
  container: { gap: 4 },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipEmoji: { fontSize: 28 },
  chipLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  tierCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  tierDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  tierDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  tierLabel: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  tierLabelActive: {
    color: Colors.primary,
  },
  tierSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  toggleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  toggleEmoji: { fontSize: 24 },
  toggleLabel: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  toggleLabelActive: {
    color: Colors.primary,
  },
  toggleSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subFields: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  goalCard: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  goalCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  goalEmoji: { fontSize: 28 },
  goalLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  goalLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
