import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Speech from "expo-speech";
import Svg, { Path } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  PERSONAL_CA_TOTAL_STEPS,
  PersonalCAStepBody,
  personalCASection,
  type CAChecklist,
} from "./personalCASteps";
import type { TaxCalcState } from "./useTaxCalculatorState";
import { themedStyles, Colors } from "@/constants/theme";
import { GoldText } from "@/components/ui/GoldMirror";

/** Step 1 (checklist): only screen with voice. Spaced for clearer TTS. */
const PERSONAL_CA_STEP1_WELCOME_TTS =
  "Welcome to Finkoin - your Personal CA. Please have your documents ready before we start.";

function SpeakerGlyph({ muted }: { muted: boolean }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.primaryText}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 9v6h4l5 4V5L8 9H4z" />
      <Path d={muted ? "M16 10l4 4M20 10l-4 4" : "M16 9a4 4 0 0 1 0 6"} />
    </Svg>
  );
}

/**
 * Guided 19-step Q&A. On the PWA this is a fixed dialog over the page; here it
 * renders inline in place of the worksheet so the host screen's keyboard
 * handling keeps the focused field visible.
 */
export function PersonalCAWizard({
  s,
  step,
  setStep,
  checklist,
  setChecklist,
  onClose,
}: {
  s: TaxCalcState;
  step: number;
  setStep: (fn: (prev: number) => number) => void;
  checklist: CAChecklist;
  setChecklist: (fn: (prev: CAChecklist) => CAChecklist) => void;
  onClose: () => void;
}) {
  const total = PERSONAL_CA_TOTAL_STEPS;
  const progress = Math.round((Math.min(step + 1, total) / total) * 100);
  const checklistReady = Object.values(checklist).every(Boolean);
  const isLast = step >= total - 1;

  const [speechMuted, setSpeechMuted] = useState(false);

  // Welcome line on step 1 only; stop whenever the wizard leaves step 0,
  // is muted, or closes.
  useEffect(() => {
    if (speechMuted || step !== 0) return;
    Speech.stop();
    Speech.speak(PERSONAL_CA_STEP1_WELCOME_TTS, {
      language: "en-IN",
      rate: 0.94,
      pitch: 1.06,
    });
    return () => {
      Speech.stop();
    };
  }, [speechMuted, step]);

  const toggleMute = () =>
    setSpeechMuted((v) => {
      if (!v) Speech.stop();
      return !v;
    });

  const next = () => {
    if (step === 0 && !checklistReady) return;
    setStep((v) => Math.min(total - 1, v + 1));
  };
  const back = () => setStep((v) => Math.max(0, v - 1));

  return (
    <View style={styles.card} accessibilityLabel="Personal CA">
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <GoldText style={styles.eyebrow}>Personal CA</GoldText>
          <Text style={styles.title} accessibilityRole="header">
            Your guided tax Q&amp;A
          </Text>
          <Text style={styles.stepLine}>
            Step {Math.min(step + 1, total)} of {total} ·{" "}
            {personalCASection(step)}
          </Text>
        </View>
        <Pressable
          onPress={toggleMute}
          accessibilityRole="button"
          accessibilityLabel={speechMuted ? "Unmute voice" : "Mute voice"}
          style={({ pressed }) => [
            styles.muteBtn,
            pressed && { backgroundColor: Colors.surfaceMuted },
          ]}
        >
          <SpeakerGlyph muted={speechMuted} />
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { backgroundColor: Colors.surfaceMuted },
          ]}
        >
          <AppIcon name="close" size={16} color={Colors.primaryText} />
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.pct}>{progress}% complete</Text>

      <View style={styles.body}>
        <PersonalCAStepBody
          s={s}
          step={step}
          checklist={checklist}
          setChecklist={setChecklist}
          checklistReady={checklistReady}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={back}
          disabled={step === 0}
          accessibilityRole="button"
          style={[styles.ghostBtn, step === 0 && { opacity: 0.5 }]}
        >
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
        <View style={styles.footerRight}>
          {step >= 1 && !isLast ? (
            <Pressable
              onPress={next}
              accessibilityRole="button"
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostText}>Skip</Text>
            </Pressable>
          ) : null}
          {!isLast ? (
            <Pressable
              onPress={next}
              disabled={step === 0 && !checklistReady}
              accessibilityRole="button"
              accessibilityState={{ disabled: step === 0 && !checklistReady }}
              style={[
                styles.primaryBtn,
                step === 0 && !checklistReady && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.primaryText}>Save &amp; Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                s.syncWizardToggles();
                onClose();
              }}
              accessibilityRole="button"
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>Use these answers</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  title: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  stepLine: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  muteBtn: {
    width: 44,
    height: 44,
    marginTop: -8,
    marginRight: -8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 44,
    height: 44,
    marginTop: -8,
    marginRight: -8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    marginTop: 12,
    height: 8,
    width: "100%",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: Colors.primary },
  pct: {
    marginTop: 4,
    textAlign: "right",
    fontSize: 11,
    color: Colors.textMuted,
  },
  body: { marginTop: 16 },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  ghostBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  ghostText: { fontSize: 14, color: Colors.textSecondary },
  primaryBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
  },
  primaryText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
}));
