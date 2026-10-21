/**
 * Inline feedback card - port of web components/FeedbackWidget.tsx.
 * Posts to /api/feedback (same endpoint as FeedbackSheet).
 */
import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Polygon, Polyline } from "react-native-svg";
import { Colors, themedStyles } from "@/constants/theme";
import { siteBase } from "@/lib/splitApi";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";

const GOOGLE_REVIEW_URL = (
  process.env.EXPO_PUBLIC_GOOGLE_REVIEW_URL ?? ""
).trim();

const STAR_POINTS =
  "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

export function FeedbackCard({ pageContext }: { pageContext: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const score = useFinancialStore((s) => s.result?.overallScore ?? null);

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(false);
  const [fkAwarded, setFkAwarded] = useState(0);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`${siteBase()}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: userId || null,
          rating,
          message: message.trim() || null,
          page_context: pageContext,
          score_at_time: score,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fk_awarded?: number;
      };
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setSaving(false);
        return;
      }
      setFkAwarded(data.fk_awarded ?? 0);
      setSaving(false);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  if (done) {
    if (closed) return null;
    return (
      <View style={styles.doneWrap}>
        <View style={styles.checkCircle}>
          <Svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={Colors.primaryText}
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <Polyline points="20 6 9 17 4 12" />
          </Svg>
        </View>
        <Text style={styles.thanks}>Thanks for your feedback!</Text>
        {fkAwarded > 0 ? (
          <Text style={styles.fk}>+{fkAwarded} FK tokens added</Text>
        ) : null}
        {rating >= 4 && GOOGLE_REVIEW_URL ? (
          <View style={{ marginTop: 16, alignSelf: "stretch" }}>
            <Text style={styles.reviewCopy}>
              Love Finkoin? A quick Google review helps more people find us.
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(GOOGLE_REVIEW_URL)}
              style={styles.reviewBtn}
            >
              <Text style={styles.reviewBtnText}>Leave a Google review</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setClosed(true)}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Was this helpful?</Text>
      <Text style={styles.sub}>
        Rate your experience · 50 FK for your first feedback
      </Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => {
          const on = rating >= star;
          return (
            <Pressable
              key={star}
              accessibilityRole="button"
              accessibilityLabel={`${star} star${star > 1 ? "s" : ""}`}
              onPress={() => setRating(star)}
              style={[
                styles.star,
                on && {
                  backgroundColor: Colors.primaryLight,
                  borderColor: Colors.primary,
                },
              ]}
            >
              <Svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill={on ? Colors.primaryText : "none"}
                stroke={Colors.primaryText}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Polygon points={STAR_POINTS} />
              </Svg>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="What did you find most useful? What can we improve?"
        placeholderTextColor={Colors.textMuted}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && { borderColor: Colors.primary }]}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setClosed(true)}
          style={styles.skip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSubmit()}
          disabled={saving}
          style={[
            styles.submit,
            saving && { backgroundColor: Colors.textMuted },
          ]}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : "Submit"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { padding: 20 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sub: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },
  stars: { flexDirection: "row", gap: 8, marginBottom: 14 },
  star: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
    textAlignVertical: "top",
  },
  error: { fontSize: 12, color: Colors.error, marginTop: 6, marginBottom: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  skip: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { fontSize: 13, color: Colors.textMuted },
  submit: {
    flex: 2,
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  doneWrap: { padding: 24, alignItems: "center" },
  checkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  thanks: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  fk: { fontSize: 13, color: Colors.primaryText, fontWeight: "600" },
  reviewCopy: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: "center",
  },
  reviewBtn: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  reviewBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  doneBtn: {
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 13, color: Colors.textMuted },
}));

export default FeedbackCard;
