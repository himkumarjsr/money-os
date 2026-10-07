import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { router, useFocusEffect } from "expo-router";
import {
  FormProvider,
  useFieldArray,
  useForm,
  type FieldPath,
  type UseFormSetError,
} from "react-hook-form";
import type { ZodError } from "zod";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import { supabase } from "@/lib/supabase";
import { appStorage } from "@/lib/storage";
import { syncKv } from "@/lib/syncKv";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import {
  analyseDefaultValues,
  clearLegacyLoanScalars,
  coalesceInsuranceToggles,
  financialProfileToFormValues,
  findFirstInvalidAnalyseStep,
  newAnalyseRowId,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import {
  ANALYSE_SNAPSHOT_VERSION,
  fetchUserAnalyseSnapshot,
  upsertUserAnalyseSnapshot,
} from "@/lib/userAnalyseSnapshot";
import { invalidateProfileMonthlySalaryCache } from "@/lib/trackerProfileIncome";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import {
  STEPS,
  STEP_SCHEMAS,
  computeLiveTotals,
  detectLastStep,
  initialUiState,
  type AnalyseFormUiState,
  type PatchUi,
} from "@/components/analyse/form/shared";
import {
  ProgressPills,
  ResumeBanner,
  ResumeOptionRow,
} from "@/components/analyse/form/FormChrome";
import { Step1Profile } from "@/components/analyse/form/Step1Profile";
import { Step2Income } from "@/components/analyse/form/Step2Income";
import { Step3Obligations } from "@/components/analyse/form/Step3Obligations";
import { Step4Expenses } from "@/components/analyse/form/Step4Expenses";
import { Step5Insurance } from "@/components/analyse/form/Step5Insurance";
import { Step6Assets } from "@/components/analyse/form/Step6Assets";
import { Step7Goals } from "@/components/analyse/form/Step7Goals";
import {
  cleanLoansAndObligations,
  loanUiFromRows,
  LOANS_CLEARED_KEY,
  mergeResumeValues,
  readLoansCleared,
  ownsCarOffPatch,
  shouldAutoFillEmergencyTarget,
  startFreshUiState,
} from "@/components/analyse/form/formState";

const FINANCIAL_PERSIST_NAME = "finkoin-financial-mobile";
const AI_CACHE_KEY = "finkoin_ai_cache";

function wipeAnalyseLocalCaches() {
  try {
    const uid = useAuthStore.getState().user?.id ?? "__guest__";
    void appStorage.removeItem(`${FINANCIAL_PERSIST_NAME}:${uid}`);
    void appStorage.removeItem(FINANCIAL_PERSIST_NAME);
    syncKv.removeItem(AI_CACHE_KEY);
    syncKv.removeItem(LOANS_CLEARED_KEY);
  } catch {
    /* ignore */
  }
}

/** Every Zod issue → RHF error at its dotted path; returns the banner message. */
function applyZodIssues(
  error: ZodError,
  setError: UseFormSetError<AnalyseFormValues>,
  fallback: string,
): string {
  const seen = new Set<string>();
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    setError(key as FieldPath<AnalyseFormValues>, {
      type: "manual",
      message: issue.message,
    });
  }
  return (
    error.issues.find((i) => i.path.length > 0)?.message ??
    error.issues.find((i) => i.path.length === 0)?.message ??
    fallback
  );
}

export default function AnalyseFormScreen() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight, scrollRef, onScroll, onFocusWithin } =
    useKeyboardSheet();
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const step = useFinancialStore((s) => s.currentStep);
  const setStep = useFinancialStore((s) => s.setCurrentStep);
  const setAnalysis = useFinancialStore((s) => s.setAnalysis);
  const setFullAnalysis = useFinancialStore((s) => s.setFullAnalysis);

  const methods = useForm<AnalyseFormValues>({
    defaultValues: analyseDefaultValues,
    mode: "onSubmit",
    shouldUnregister: false,
  });
  const { control, watch, setValue, reset, setError, clearErrors, getValues } =
    methods;
  const loans = useFieldArray({ control, name: "unifiedLoans" });
  const replaceLoans = loans.replace;

  const [ui, setUi] = useState<AnalyseFormUiState>(() =>
    initialUiState(useFinancialStore.getState().lastSubmission),
  );
  const patchUi: PatchUi = useCallback(
    (patch) => setUi((prev) => ({ ...prev, ...patch })),
    [],
  );
  const uiSeededRef = useRef(useFinancialStore.getState().hasHydrated);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepNavError, setStepNavError] = useState<string | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showResumeOption, setShowResumeOption] = useState(false);
  const resumeCheckedRef = useRef(false);
  /** Per-user: avoid re-fetching cloud snapshot every mount; cleared when auth user changes. */
  const cloudHydrateKey = useRef<string | null>(null);
  /** After "Start fresh", do not immediately pull server snapshot for this account. */
  const skipCloudHydrateRef = useRef(false);

  const prevLifeStageRef = useRef<AnalyseFormValues["lifeStage"] | null>(null);
  const prevHasHealthRef = useRef<boolean | undefined>(undefined);
  const prevHasTermRef = useRef<boolean | undefined>(undefined);
  const prevHasOtherInsuranceRef = useRef<boolean | undefined>(undefined);
  const prevOwnsHomeRef = useRef<boolean | undefined>(undefined);
  const prevOwnsCarRef = useRef<boolean | undefined>(undefined);
  const prevPostOfficeRef = useRef<boolean | undefined>(undefined);
  const prevParentsSupportRef = useRef<number | undefined>(undefined);
  const emergencyAutoFilledRef = useRef(false);

  const values = watch();
  const isFormDirty = methods.formState.isDirty;
  const emergencyTargetEdited =
    !!methods.formState.dirtyFields.emergencyFundTarget ||
    !!methods.formState.touchedFields.emergencyFundTarget;
  const live = computeLiveTotals(values);
  const lifeStage = values.lifeStage;
  const hasHealthInsurance = values.hasHealthInsurance;
  const hasTermInsurance = values.hasTermInsurance;
  const hasOtherInsurance = values.hasOtherInsurance;
  const otherInsuranceCount = values.otherInsurancePremiums?.length ?? 0;
  const ownsHome = values.ownsHome;
  const ownsCar = values.ownsCar;
  const hasPostOfficeSchemes = values.hasPostOfficeSchemes;
  const parentsSupport = values.parentsSupport ?? 0;
  const primaryGoal = values.primaryGoal;
  const { hasEligibleGirlChild, emergencyFundSuggestion } = live;

  useEffect(() => {
    if ((values.rentAmount ?? 0) > 0) patchUi({ isRenting: true });
    if ((values.creditCardBillMonthly ?? 0) > 0)
      patchUi({ hasCreditCardOutstanding: true });
  }, [values.rentAmount, values.creditCardBillMonthly, patchUi]);

  // Mobile store may hydrate after mount, so form + loan UI are restored here, not at mount.
  useLayoutEffect(() => {
    if (!hasHydrated) return;
    const { analysis: draft } = useFinancialStore.getState();
    const cached = { ...(draft ?? {}) } as Record<string, unknown>;
    if (cached.nscMonthly != null && cached.nscDepositAmount == null) {
      cached.nscDepositAmount = cached.nscMonthly;
    }
    delete cached.nscMonthly;
    const cachedTyped = cached as Partial<AnalyseFormValues>;
    const merged = coalesceInsuranceToggles({
      ...analyseDefaultValues,
      ...mergeResumeValues(
        lastSubmission ? financialProfileToFormValues(lastSubmission) : {},
        cachedTyped,
        readLoansCleared(syncKv),
      ),
    } as AnalyseFormValues);
    const resumedLoans = merged.unifiedLoans ?? [];
    reset(merged);
    replaceLoans(resumedLoans);
    const loanUi = loanUiFromRows(resumedLoans);
    if (!uiSeededRef.current) {
      uiSeededRef.current = true;
      setUi({ ...initialUiState(lastSubmission), ...loanUi });
    } else {
      patchUi(loanUi);
    }
  }, [hasHydrated, lastSubmission, reset, replaceLoans, patchUi]);

  useEffect(() => {
    skipCloudHydrateRef.current = false;
    cloudHydrateKey.current = null;
  }, [authUserId]);

  useEffect(() => {
    if (!hasHydrated || !authUserId) return;
    const doneKey = authUserId;
    if (cloudHydrateKey.current === doneKey) return;
    if (skipCloudHydrateRef.current) {
      cloudHydrateKey.current = doneKey;
      return;
    }

    const st = useFinancialStore.getState();
    if (st.lastSubmission) {
      cloudHydrateKey.current = doneKey;
      return;
    }
    if (st.currentStep !== 0) {
      cloudHydrateKey.current = doneKey;
      return;
    }
    if ((st.profile?.monthlySalary ?? 0) > 0) {
      cloudHydrateKey.current = doneKey;
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchUserAnalyseSnapshot(authUserId);
        if (cancelled) return;
        if (
          remote?.lastSubmission &&
          remote.result &&
          isValidStoredAnalysis(remote.result)
        ) {
          useFinancialStore
            .getState()
            .hydrateFromSnapshot(remote.lastSubmission, remote.result, {
              analysisPatch: remote.analysis ?? undefined,
            });
        }
      } finally {
        if (!cancelled) cloudHydrateKey.current = doneKey;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, authUserId, lastSubmission, step]);

  // Web runs this on mount (store is synchronously hydrated there).
  useEffect(() => {
    if (!hasHydrated || resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    const store = useFinancialStore.getState();
    if (store.result) {
      setShowResumeOption(true);
    } else if (
      (store.profile?.monthlySalary ?? 0) > 0 ||
      store.currentStep > 0
    ) {
      setShowResumeBanner(true);
    }
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const subscription = watch(() => {
      setAnalysis(getValues());
    });
    return () => subscription.unsubscribe();
  }, [hasHydrated, setAnalysis, watch, getValues]);

  useEffect(() => {
    const prev = prevLifeStageRef.current;
    if (prev !== null && prev !== "bachelor" && lifeStage === "bachelor") {
      setValue("spouseIncome", 0, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue("spouseAge", 0, { shouldDirty: false, shouldValidate: false });
    }
    if (prev !== null && lifeStage !== "kids" && prev === "kids") {
      setValue("numberOfKids", undefined);
      setValue("kidsAges", []);
      setValue("kidsGenders", []);
      setValue("kidsSchoolFees", 0);
      setValue("kidsActivities", 0);
      setValue("ssy", 0);
    }
    prevLifeStageRef.current = lifeStage;
  }, [lifeStage, setValue]);

  useEffect(() => {
    const prev = prevHasHealthRef.current;
    if (prev === true && hasHealthInsurance === false) {
      setValue("healthInsuranceSumInsured", 0);
      setValue("healthInsurancePremiumInput", 0);
      setValue("healthInsurancePremiumFrequency", "monthly");
    }
    prevHasHealthRef.current = hasHealthInsurance;
  }, [hasHealthInsurance, setValue]);

  useEffect(() => {
    const prev = prevHasTermRef.current;
    if (prev === true && hasTermInsurance === false) {
      setValue("termInsuranceSumAssured", 0);
      setValue("termInsurancePremiumInput", 0);
      setValue("termInsurancePremiumFrequency", "monthly");
    }
    prevHasTermRef.current = hasTermInsurance;
  }, [hasTermInsurance, setValue]);

  useEffect(() => {
    const prev = prevHasOtherInsuranceRef.current;
    if (hasOtherInsurance && prev === false && otherInsuranceCount === 0) {
      setValue("otherInsurancePremiums", [
        {
          id: newAnalyseRowId(),
          policyName: "",
          premiumAmount: 0,
          frequency: "monthly",
          maturityAmount: 0,
          maturityYear: 0,
        },
      ]);
    }
    if (prev === true && hasOtherInsurance === false) {
      setValue("otherInsurancePremiums", []);
    }
    prevHasOtherInsuranceRef.current = hasOtherInsurance;
  }, [hasOtherInsurance, otherInsuranceCount, setValue]);

  useEffect(() => {
    const prev = prevOwnsHomeRef.current;
    if (prev === true && ownsHome === false) {
      setValue("homeMarketValue", 0);
      setValue("homeLoanOutstanding", 0);
      setValue("homeLoanEMI", 0);
      setValue("homeLoanEMIDay", undefined);
    }
    prevOwnsHomeRef.current = ownsHome;
  }, [ownsHome, setValue]);

  useEffect(() => {
    const prev = prevOwnsCarRef.current;
    if (prev === true && ownsCar === false) {
      for (const [key, value] of Object.entries(ownsCarOffPatch())) {
        setValue(key as keyof AnalyseFormValues, value as never);
      }
    }
    prevOwnsCarRef.current = ownsCar;
  }, [ownsCar, setValue]);

  useEffect(() => {
    if (!hasEligibleGirlChild) {
      setValue("ssy", 0);
    }
  }, [hasEligibleGirlChild, setValue]);

  useEffect(() => {
    const prev = prevPostOfficeRef.current;
    if (prev === true && hasPostOfficeSchemes === false) {
      setValue("postOfficeSchemes", []);
      setValue("nscDepositAmount", 0);
      setValue("nscMaturityYear", 0);
      setValue("investsInNsc", false);
    }
    prevPostOfficeRef.current = hasPostOfficeSchemes;
  }, [hasPostOfficeSchemes, setValue]);

  useEffect(() => {
    const prev = prevParentsSupportRef.current;
    if (prev !== undefined && prev > 0 && parentsSupport <= 0) {
      setValue("parentsCity", undefined);
      setValue("parentsHealthInsuranceSumInsured", 0);
      setValue("parentsEmergencyCash", 0);
    }
    prevParentsSupportRef.current = parentsSupport;
  }, [parentsSupport, setValue]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (
      !shouldAutoFillEmergencyTarget({
        alreadyFired: emergencyAutoFilledRef.current,
        primaryGoal,
        suggestion: emergencyFundSuggestion,
        currentValue: getValues("emergencyFundTarget"),
        userEdited: emergencyTargetEdited,
      })
    ) {
      return;
    }
    emergencyAutoFilledRef.current = true;
    setValue("emergencyFundTarget", Math.round(emergencyFundSuggestion ?? 0), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [
    hasHydrated,
    primaryGoal,
    emergencyFundSuggestion,
    emergencyTargetEdited,
    setValue,
    getValues,
  ]);

  const scrollStepIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [scrollRef]);

  /** Writes sanitised loan / obligation arrays back into the form (only when they changed). */
  const applyCleanedLoans = useCallback(
    (formValues: AnalyseFormValues) => {
      const cleaned = cleanLoansAndObligations(formValues);
      if (
        cleaned.additionalObligations.length !==
        (formValues.additionalObligations?.length ?? 0)
      ) {
        setValue("additionalObligations", cleaned.additionalObligations, {
          shouldDirty: true,
        });
      }
      if (
        JSON.stringify(cleaned.unifiedLoans) !==
        JSON.stringify(formValues.unifiedLoans ?? [])
      ) {
        replaceLoans(cleaned.unifiedLoans);
      }
      return cleaned;
    },
    [replaceLoans, setValue],
  );

  const forceNext = useCallback(() => {
    clearErrors();
    setStepNavError(null);
    const formValues = getValues();
    // Keep form state aligned with schema sanitizers so Next isn't blocked by
    // stale additionalObligations / legacy loanType labels with no visible fields.
    const {
      unifiedLoans: cleanedLoans,
      additionalObligations: cleanedObligations,
    } = applyCleanedLoans(formValues);
    const loanPatch: Partial<AnalyseFormValues> = {
      unifiedLoans: cleanedLoans,
      additionalObligations: cleanedObligations,
    };
    if (cleanedLoans.length === 0) {
      Object.assign(loanPatch, clearLegacyLoanScalars());
      patchUi({ hasLoans: false });
    }
    // Keep draft/cache in sync with lender names before leaving the step.
    setAnalysis({
      ...getValues(),
      ...loanPatch,
    });

    const currentSchema = STEP_SCHEMAS[step];
    const parsed = currentSchema.safeParse({
      ...formValues,
      additionalObligations: cleanedObligations,
      unifiedLoans: cleanedLoans,
    });
    if (!parsed.success) {
      setStepNavError(
        applyZodIssues(
          parsed.error,
          setError,
          "Please fix the highlighted fields before continuing.",
        ),
      );
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    scrollStepIntoView();
  }, [
    applyCleanedLoans,
    clearErrors,
    getValues,
    patchUi,
    scrollStepIntoView,
    setAnalysis,
    setError,
    setStep,
    step,
  ]);

  const goBack = useCallback(() => {
    clearErrors();
    setStepNavError(null);
    setStep((current) => Math.max(current - 1, 0));
    scrollStepIntoView();
  }, [clearErrors, scrollStepIntoView, setStep]);

  const jumpToStep = useCallback(
    (index: number) => {
      clearErrors();
      setStepNavError(null);
      setStep(Math.max(0, Math.min(index, STEPS.length - 1)));
      scrollStepIntoView();
    },
    [clearErrors, scrollStepIntoView, setStep],
  );

  const handleFinalSubmit = useCallback(async () => {
    clearErrors();
    setSubmitError(null);
    setStepNavError(null);
    applyCleanedLoans(getValues());
    if (!getValues("primaryGoal")?.trim()) {
      setValue("primaryGoal", "grow_wealth");
    }
    const formValues = getValues();
    const invalid = findFirstInvalidAnalyseStep(formValues);
    if (invalid) {
      const stepIndex = Math.max(
        0,
        Math.min(invalid.step - 1, STEPS.length - 1),
      );
      const fallback = `Please fix the highlighted fields in ${STEPS[stepIndex]?.title ?? "this step"}, then try again.`;
      const message =
        invalid.issues.find((i) => i.path.length > 0)?.message ??
        invalid.issues[0]?.message ??
        fallback;
      const seen = new Set<string>();
      for (const issue of invalid.issues) {
        const key = issue.path.join(".");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        setError(key as FieldPath<AnalyseFormValues>, {
          type: "manual",
          message: issue.message,
        });
      }
      setStep(stepIndex);
      if (stepIndex === STEPS.length - 1) setSubmitError(message);
      else setStepNavError(message);
      scrollStepIntoView();
      return;
    }

    if (!useAuthStore.getState().user?.id) {
      Alert.alert(
        "Sign in required",
        "Please log in to save your health check.",
      );
      router.push("/(auth)/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const previousProfile = useFinancialStore.getState().lastSubmission;
      const mergedValues = coalesceInsuranceToggles({
        ...formValues,
        primaryGoal: formValues.primaryGoal || "grow_wealth",
        monthlySalary: formValues.monthlySalary ?? 0,
      });
      setAnalysis(mergedValues);
      const normalized = normalizeAnalyseFormValues(mergedValues);
      try {
        setFullAnalysis(normalized);
      } catch (e) {
        console.error("Submit / setFullAnalysis error:", e);
        setSubmitError("Analysis failed. Please try again.");
        return;
      }

      const { result: nextResult, lastSubmission: savedProfile } =
        useFinancialStore.getState();
      if (!nextResult || !savedProfile) {
        setSubmitError("Analysis failed. Please try again.");
        return;
      }

      // Navigate immediately — cloud save must not block the report.
      router.push("/analyse/result");

      void (async () => {
        try {
          const uid = useAuthStore.getState().user?.id;
          if (!uid) return;

          const { error } = await upsertUserAnalyseSnapshot(uid, {
            profile: savedProfile,
            result: nextResult,
            submittedAt: new Date().toISOString(),
            version: ANALYSE_SNAPSHOT_VERSION,
            analysis: mergedValues,
          });
          if (error) console.warn("Snapshot save failed:", error.message);
          else void invalidateProfileMonthlySalaryCache(uid);

          // Legacy table kept for older clients / back-compat
          void supabase
            .from("user_analysis")
            .upsert(
              {
                user_id: uid,
                profile: savedProfile,
                analysis_result: nextResult,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            )
            .then(({ error: legacyErr }) => {
              if (legacyErr)
                console.warn("Legacy analysis save failed:", legacyErr.message);
            });

          void useObligationStore
            .getState()
            .syncFromHealthCheck(uid, savedProfile, previousProfile)
            .catch((err) => console.warn("Obligation sync failed:", err));
        } catch (err) {
          console.warn("Post-submit snapshot failed:", err);
        }
      })();
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    applyCleanedLoans,
    clearErrors,
    getValues,
    scrollStepIntoView,
    setAnalysis,
    setError,
    setFullAnalysis,
    setStep,
    setValue,
  ]);

  const handleStartFresh = useCallback(() => {
    skipCloudHydrateRef.current = true;
    wipeAnalyseLocalCaches();
    useFinancialStore.getState().resetStore();
    reset(
      coalesceInsuranceToggles({
        ...analyseDefaultValues,
        unifiedLoans: [],
        additionalObligations: [],
        otherInsurancePremiums: [],
        customInvestments: [],
      } as AnalyseFormValues),
    );
    replaceLoans([]);
    setUi(startFreshUiState());
    emergencyAutoFilledRef.current = false;
    clearErrors();
    setStepNavError(null);
    setSubmitError(null);
    setShowResumeOption(false);
    setShowResumeBanner(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [reset, replaceLoans, clearErrors, scrollRef]);

  const leaveForm = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  /** Shared by the header ← and Android hardware back: step back, or leave from step 1. */
  const handleBack = useCallback(() => {
    if (step > 0) {
      goBack();
      return;
    }
    if (!isFormDirty) {
      leaveForm();
      return;
    }
    Alert.alert(
      "Leave the health check?",
      "Your progress is saved as a draft — you can pick up where you left off.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", onPress: leaveForm },
      ],
    );
  }, [step, goBack, leaveForm, isFormDirty]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack]),
  );

  const isLastStep = step === STEPS.length - 1;
  const footerError = isLastStep ? submitError : stepNavError;
  const stepProps = { live, ui, patchUi };

  return (
    <FormProvider {...methods}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.stepInfo}>
            <Text style={styles.stepLabel}>
              Step {step + 1} of {STEPS.length}
            </Text>
            <Text style={styles.stepTitle} numberOfLines={1}>
              {STEPS[step]?.title ?? "Profile"}
            </Text>
          </View>
        </View>
        <ProgressPills step={step} onJump={jumpToStep} />

        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 32 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View onFocus={onFocusWithin}>
            {showResumeOption ? (
              <ResumeOptionRow
                onViewReport={() => router.push("/analyse/result")}
                onStartFresh={handleStartFresh}
              />
            ) : null}
            {showResumeBanner ? (
              <ResumeBanner
                onResume={() => {
                  setShowResumeBanner(false);
                  const last = detectLastStep(
                    useFinancialStore.getState().profile,
                  );
                  jumpToStep(last);
                }}
                onStartFresh={handleStartFresh}
              />
            ) : null}

            {step === 0 ? <Step1Profile /> : null}
            {step === 1 ? <Step2Income live={live} /> : null}
            {step === 2 ? (
              <Step3Obligations {...stepProps} loans={loans} />
            ) : null}
            {step === 3 ? <Step4Expenses live={live} /> : null}
            {step === 4 ? <Step5Insurance /> : null}
            {step === 5 ? <Step6Assets live={live} /> : null}
            {step === 6 ? <Step7Goals live={live} /> : null}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {footerError ? (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>{footerError}</Text>
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <Pressable
              onPress={goBack}
              disabled={step === 0}
              accessibilityRole="button"
              style={[styles.backNavBtn, step === 0 && { opacity: 0.5 }]}
            >
              <Text style={styles.backNavText}>Back</Text>
            </Pressable>
            {isLastStep ? (
              <Pressable
                onPress={() => void handleFinalSubmit()}
                disabled={isSubmitting}
                accessibilityRole="button"
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: isSubmitting ? "#AFA9EC" : Colors.primary,
                  },
                ]}
              >
                <Text style={styles.primaryText}>
                  {isSubmitting
                    ? "Analysing your finances…"
                    : "Analyse my finances →"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={forceNext}
                accessibilityRole="button"
                style={[styles.primaryBtn, { backgroundColor: Colors.primary }]}
              >
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </FormProvider>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
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
  stepInfo: { flex: 1, gap: 2 },
  stepLabel: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.xl,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backNavBtn: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  backNavText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  primaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  errorBanner: {
    borderRadius: 8,
    backgroundColor: "#FCEBEB",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 13,
    color: "#791F1F",
    textAlign: "center",
  },
});
