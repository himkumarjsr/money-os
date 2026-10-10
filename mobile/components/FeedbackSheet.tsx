/**
 * Feedback wizard — port of web components/feedback/FeedbackModal.tsx
 * (in-app wizard path), shown as a bottom sheet. Posts to /api/feedback.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, themedStyles } from "@/constants/theme";
import { siteBase } from "@/lib/splitApi";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const STEPS = [
  {
    title: "Help us improve",
    subtitle: "A few short steps — like our guided checkup.",
  },
  {
    title: "Step 1 · Overall experience",
    subtitle: "How would you rate Finkoin so far?",
  },
  {
    title: "Step 2 · Where in the app?",
    subtitle: "What did you use most recently?",
  },
  {
    title: "Step 3 · What worked well?",
    subtitle: "Optional — tell us what you liked.",
  },
  {
    title: "Step 4 · What should improve?",
    subtitle: "Optional — bugs, confusion, or missing features.",
  },
  {
    title: "Step 5 · Recommendation",
    subtitle: "Would you recommend Finkoin to a friend?",
  },
] as const;

const AREAS = [
  { id: "analyse", label: "Financial health check / Analyse" },
  { id: "calculators", label: "Calculators" },
  { id: "tracker", label: "Expense tracker" },
  { id: "plans", label: "Plans & billing" },
  { id: "learn", label: "Learn / articles" },
  { id: "other", label: "Something else" },
] as const;

const RECOMMEND = [
  { id: "yes", label: "Yes, definitely" },
  { id: "maybe", label: "Maybe" },
  { id: "no", label: "Not right now" },
] as const;

type Recommend = "yes" | "maybe" | "no" | "";

export function FeedbackSheet({
  visible,
  onClose,
  source = "app_profile_menu",
}: {
  visible: boolean;
  onClose: () => void;
  source?: string;
}) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [area, setArea] = useState<(typeof AREAS)[number]["id"] | "">("");
  const [highlights, setHighlights] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommend, setRecommend] = useState<Recommend>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setRating(0);
    setArea("");
    setHighlights("");
    setImprovements("");
    setRecommend("");
    setError(null);
    setDone(false);
  }, [visible]);

  const areaLabel = useMemo(
    () => AREAS.find((a) => a.id === area)?.label ?? "",
    [area],
  );
  const last = step === STEPS.length - 1;
  const canGoNext =
    step === 0 || step === 3 || step === 4
      ? true
      : step === 1
        ? rating >= 1
        : step === 2
          ? area !== ""
          : false;

  const submit = async () => {
    if (!isLoggedIn || rating < 1 || !area || !recommend) return;
    setSubmitting(true);
    setError(null);
    try {
      const hl = highlights.trim();
      const im = improvements.trim();
      const message = [
        `Area: ${areaLabel}`,
        hl && `What worked:\n${hl}`,
        im && `To improve:\n${im}`,
        `Recommend: ${recommend}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`${siteBase()}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rating,
          message,
          page_context: `wizard_${source}_${area}`,
          score_at_time: null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(
          data.message ?? data.error ?? "Could not save feedback. Try again.",
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = STEPS[step];

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <Text style={styles.eyebrow}>FEEDBACK</Text>
      <Text style={styles.title}>{done ? "Thank you!" : meta.title}</Text>
      {!done ? <Text style={styles.subtitle}>{meta.subtitle}</Text> : null}

      {!done ? (
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                i <= step && { backgroundColor: Colors.primary },
                i === step && { width: 20 },
              ]}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.body}>
        {!isLoggedIn ? (
          <Text style={styles.text}>
            Please sign in to send feedback so we can follow up.
          </Text>
        ) : done ? (
          <Text style={styles.success}>
            Your feedback helps us make Finkoin better for everyone.
          </Text>
        ) : step === 0 ? (
          <View style={{ gap: 8 }}>
            {[
              "Five quick questions — tap Next to begin.",
              "Takes under a minute.",
              "You can skip optional text fields.",
            ].map((t) => (
              <Text key={t} style={styles.text}>
                • {t}
              </Text>
            ))}
          </View>
        ) : step === 1 ? (
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                style={[styles.star, n <= rating && styles.starOn]}
                accessibilityRole="button"
                accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Text
                  style={[
                    styles.starText,
                    n <= rating && { color: Colors.onPrimary },
                  ]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
        ) : step === 2 ? (
          <View style={{ gap: 8 }}>
            {AREAS.map((a) => (
              <Option
                key={a.id}
                label={a.label}
                active={area === a.id}
                onPress={() => setArea(a.id)}
              />
            ))}
          </View>
        ) : step === 3 || step === 4 ? (
          <TextInput
            value={step === 3 ? highlights : improvements}
            onChangeText={step === 3 ? setHighlights : setImprovements}
            placeholder={
              step === 3
                ? "e.g. The tracker made my month clear"
                : "e.g. I couldn't find…"
            }
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1500}
            style={styles.input}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                <Text style={styles.bold}>Rating:</Text> {rating}/5
              </Text>
              <Text style={styles.summaryText}>
                <Text style={styles.bold}>Area:</Text> {areaLabel || "—"}
              </Text>
              {highlights.trim() ? (
                <Text style={styles.summaryText}>
                  <Text style={styles.bold}>Worked well:</Text>{" "}
                  {highlights.trim()}
                </Text>
              ) : null}
              {improvements.trim() ? (
                <Text style={styles.summaryText}>
                  <Text style={styles.bold}>Improve:</Text>{" "}
                  {improvements.trim()}
                </Text>
              ) : null}
            </View>
            <Text style={styles.textStrong}>Would you recommend Finkoin?</Text>
            {RECOMMEND.map((r) => (
              <Option
                key={r.id}
                label={r.label}
                active={recommend === r.id}
                onPress={() => setRecommend(r.id)}
              />
            ))}
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        {!isLoggedIn ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push("/(auth)/login");
            }}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>Sign in</Text>
          </Pressable>
        ) : done ? (
          <Pressable onPress={onClose} style={[styles.btn, styles.btnPrimary]}>
            <Text style={styles.btnPrimaryText}>Close</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => (step === 0 ? onClose() : setStep(step - 1))}
              style={[styles.btn, styles.btnGhost]}
            >
              <Text style={styles.btnGhostText}>
                {step === 0 ? "Cancel" : "Back"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                last ? void submit() : canGoNext && setStep(step + 1)
              }
              disabled={last ? !recommend || submitting : !canGoNext}
              style={[
                styles.btn,
                styles.btnPrimary,
                (last ? !recommend || submitting : !canGoNext) && {
                  opacity: 0.45,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {last ? "Submit" : "Next"}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

function Option({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && styles.optionOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.optionText, active && { color: Colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: Colors.primary,
  },
  title: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors.textSecondary },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: Colors.border },
  body: { paddingVertical: 16 },
  text: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  textStrong: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  success: { fontSize: 14, fontWeight: "600", color: Colors.successText },
  stars: { flexDirection: "row", justifyContent: "center", gap: 8 },
  star: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  starOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  starText: { fontSize: 22, color: "#CBD5E1" },
  option: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  optionOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlignVertical: "top",
  },
  summary: {
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  summaryText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  bold: { fontWeight: "600", color: Colors.textPrimary },
  error: { marginTop: 12, fontSize: 14, color: Colors.error },
  footer: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
  btnGhost: { borderWidth: 1, borderColor: Colors.border },
  btnGhostText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
}));
