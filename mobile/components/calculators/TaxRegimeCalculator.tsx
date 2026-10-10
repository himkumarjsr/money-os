import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PaywallSheet } from "@/components/analyse/PaywallSheet";
import { AdditionalIncomeStep } from "./tax/AdditionalIncomeStep";
import { DeductionsStep } from "./tax/DeductionsStep";
import { PersonalCAWizard } from "./tax/PersonalCAWizard";
import { ProfileStep } from "./tax/ProfileStep";
import { ExemptMemo, ResultsStep } from "./tax/ResultsStep";
import { SalaryStep } from "./tax/SalaryStep";
import { EMPTY_CA_CHECKLIST, type CAChecklist } from "./tax/personalCASteps";
import {
  clearStoredTaxInputs,
  useTaxCalculatorState,
} from "./tax/useTaxCalculatorState";
import { themedStyles, Colors, tintBg } from "@/constants/theme";

export { TAX_CALCULATOR_STORAGE_KEY } from "./tax/useTaxCalculatorState";

function TaxRegimeCalculatorBody({ onReset }: { onReset: () => void }) {
  const s = useTaxCalculatorState();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [personalCAOpen, setPersonalCAOpen] = useState(true);
  const [personalCAStep, setPersonalCAStep] = useState(0);
  const [caChecklist, setCaChecklist] =
    useState<CAChecklist>(EMPTY_CA_CHECKLIST);

  const closePersonalCA = () => {
    setPersonalCAOpen(false);
    setPersonalCAStep(0);
  };

  return (
    <View style={styles.root}>
      {!personalCAOpen ? (
        <>
          <View style={styles.topRow}>
            <View style={{ flexShrink: 1 }}>
              {s.storageReady ? (
                <Text style={styles.saved}>✓ Progress auto-saved locally</Text>
              ) : null}
              {s.savedAtDisplay ? (
                <Text style={styles.savedAt}>
                  Last saved{" "}
                  {new Date(s.savedAtDisplay).toLocaleString("en-IN")}
                </Text>
              ) : null}
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={() => {
                  setPersonalCAOpen(true);
                  setPersonalCAStep(0);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.caBtn,
                  pressed && { backgroundColor: Colors.primaryLight },
                ]}
              >
                <Text style={styles.caBtnText}>Personal CA (guided)</Text>
              </Pressable>
              <Pressable
                onPress={onReset}
                accessibilityRole="button"
                style={styles.resetBtn}
              >
                <Text style={styles.resetText}>Reset calculator</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.intro}>
            FY 2025-26 (AY 2026-27) planner. Tap{" "}
            <Text style={styles.introQ}>?</Text> on any row for context. Equity
            CG uses illustrative 20% STCG / 12.5% LTCG after ₹1.25L — verify
            with a CA.
          </Text>

          <View style={styles.steps}>
            <ProfileStep s={s} />
            <SalaryStep s={s} />
            <AdditionalIncomeStep s={s} />
            <DeductionsStep s={s} />
            <ExemptMemo s={s} />
            <ResultsStep s={s} />
          </View>
        </>
      ) : null}

      {paywallOpen ? (
        <PaywallSheet
          visible
          onClose={() => setPaywallOpen(false)}
          title="Unlock tax regime deep report"
          subtitle="Full narrative and printable layout."
          bulletPoints={[
            "Slab + equity CG narrative",
            "What-if scenarios",
            "Print / PDF via browser",
            "Checklist for CA review",
          ]}
        />
      ) : null}

      {personalCAOpen ? (
        <PersonalCAWizard
          s={s}
          step={personalCAStep}
          setStep={setPersonalCAStep}
          checklist={caChecklist}
          setChecklist={setCaChecklist}
          onClose={closePersonalCA}
        />
      ) : null}

      {!personalCAOpen ? (
        <Text style={styles.footer}>
          Educational only — verify against notified law and Form 16.
        </Text>
      ) : null}
    </View>
  );
}

export function TaxRegimeCalculator() {
  const [resetKey, setResetKey] = useState(0);
  return (
    <TaxRegimeCalculatorBody
      key={resetKey}
      onReset={() => {
        clearStoredTaxInputs();
        setResetKey((k) => k + 1);
      }}
    />
  );
}

const styles = themedStyles(() => ({
  root: { gap: 24 },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  saved: { fontSize: 12, color: Colors.textMuted },
  savedAt: { marginTop: 2, fontSize: 10, color: Colors.textMuted },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  caBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tintBg("#DCD9F7"),
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
  },
  caBtnText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  resetBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  resetText: { fontSize: 13, color: Colors.textMuted },
  intro: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  introQ: { fontWeight: "600", color: Colors.primary },
  steps: { gap: 24 },
  footer: { fontSize: 12, color: Colors.textMuted },
}));
