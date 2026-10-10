import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PaywallSheet } from "@/components/analyse/PaywallSheet";
import { AdditionalIncomeStep } from "./tax/AdditionalIncomeStep";
import { DeductionsStep } from "./tax/DeductionsStep";
import { PersonalCAWizard } from "./tax/PersonalCAWizard";
import { ProfileStep } from "./tax/ProfileStep";
import { ExemptMemo, ResultsStep } from "./tax/ResultsStep";
import { SalaryStep } from "./tax/SalaryStep";
import {
  EMPTY_CA_CHECKLIST,
  type CAChecklist,
} from "./tax/personalCASteps";
import {
  clearStoredTaxInputs,
  useTaxCalculatorState,
} from "./tax/useTaxCalculatorState";

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
                  pressed && { backgroundColor: "#EEEDFE" },
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

const styles = StyleSheet.create({
  root: { gap: 24 },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  saved: { fontSize: 12, color: "#9B9A94" },
  savedAt: { marginTop: 2, fontSize: 10, color: "#C5C4BD" },
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
    borderColor: "#DCD9F7",
    backgroundColor: "#F7F6FE",
    paddingHorizontal: 12,
  },
  caBtnText: { fontSize: 12, fontWeight: "600", color: "#534AB7" },
  resetBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    paddingHorizontal: 16,
  },
  resetText: { fontSize: 13, color: "#9B9A94" },
  intro: { fontSize: 12, lineHeight: 18, color: "#7A7871" },
  introQ: { fontWeight: "600", color: "#534AB7" },
  steps: { gap: 24 },
  footer: { fontSize: 12, color: "#9B9A94" },
});
