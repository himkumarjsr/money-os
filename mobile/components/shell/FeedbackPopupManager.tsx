/**
 * Port of web FeedbackPopupManager + FeedbackWidget: a "Quick feedback" card
 * for signed-in users after 120s on a tracked product screen, once per
 * product. Posts to /api/feedback.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polygon } from "react-native-svg";
import { Colors, brand, themedStyles } from "@/constants/theme";
import { siteBase } from "@/lib/splitApi";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const SHOW_AFTER_SECONDS = 120;
const PAGES_TO_TRACK = [
  "/calculators",
  "/tracker",
  "/learn",
  "/analyse",
  "/portfolio",
  "/optimizer",
  "/split",
];
const GOOGLE_REVIEW_URL = (process.env.EXPO_PUBLIC_GOOGLE_REVIEW_URL ?? "").trim();

function productKeyFromPath(path: string) {
  return path.split("/").filter(Boolean)[0] || "app";
}

function feedbackKeys(pageKey: string, userId?: string | null) {
  const legacy = `finkoin_feedback_${pageKey}`;
  return userId ? [`finkoin_feedback_${userId}_${pageKey}`, legacy] : [legacy];
}

function hasAskedForProduct(pageKey: string, userId?: string | null) {
  return feedbackKeys(pageKey, userId).some(
    (k) => syncKv.getItem(k) === "1",
  );
}

function markFeedbackAsked(pageKey: string, userId?: string | null) {
  for (const k of feedbackKeys(pageKey, userId)) syncKv.setItem(k, "1");
}

export function FeedbackPopupManager() {
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const [show, setShow] = useState(false);
  const [context, setContext] = useState("");

  const dismissForGood = useCallback(() => {
    if (context) markFeedbackAsked(context, userId);
    setShow(false);
  }, [context, userId]);

  useEffect(() => {
    const path = pathname ?? "";
    if (!PAGES_TO_TRACK.some((p) => path.startsWith(p))) return;
    if (!isLoggedIn) return;
    const pageKey = productKeyFromPath(path);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    void hydrateSyncKv().then(() => {
      if (cancelled || hasAskedForProduct(pageKey, userId)) return;
      timer = setTimeout(() => {
        if (hasAskedForProduct(pageKey, userId)) return;
        setContext(pageKey);
        setShow(true);
      }, SHOW_AFTER_SECONDS * 1000);
    });
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [pathname, isLoggedIn, userId]);

  if (!show) return null;
  return (
    <FeedbackCard
      context={context}
      userId={userId}
      onClose={dismissForGood}
    />
  );
}

function FeedbackCard({
  context,
  userId,
  onClose,
}: {
  context: string;
  userId?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [fkAwarded, setFkAwarded] = useState(0);
  const [error, setError] = useState("");

  const submit = async () => {
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
          user_id: userId ?? null,
          rating,
          message: message.trim() || null,
          page_context: context,
          score_at_time: null,
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
      markFeedbackAsked(context, userId);
      setFkAwarded(data.fk_awarded ?? 0);
      setSaving(false);
      setDone(true);
      if (!(rating >= 4 && GOOGLE_REVIEW_URL)) setTimeout(onClose, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[styles.card, { bottom: 90 + insets.bottom }]}
        accessibilityViewIsModal
      >
        <View style={styles.cardHead}>
          <Text style={styles.cardHeadText}>Quick feedback</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close feedback"
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {done ? (
          <View style={styles.doneBody}>
            <View style={styles.doneCircle}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 6 9 17l-5-5"
                  stroke={Colors.primaryText}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.doneTitle}>Thanks for your feedback!</Text>
            {fkAwarded > 0 ? (
              <Text style={styles.doneFk}>+{fkAwarded} FK tokens added</Text>
            ) : null}
            {rating >= 4 && GOOGLE_REVIEW_URL ? (
              <View style={{ marginTop: 16, alignSelf: "stretch" }}>
                <Text style={styles.reviewCopy}>
                  Love Finkoin? A quick Google review helps more people find us.
                </Text>
                <Pressable
                  onPress={() => void Linking.openURL(GOOGLE_REVIEW_URL)}
                  style={styles.submit}
                  accessibilityRole="link"
                >
                  <Text style={styles.submitText}>Leave a Google review</Text>
                </Pressable>
                <Pressable onPress={onClose} style={[styles.skip, { marginTop: 8 }]}>
                  <Text style={styles.skipText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.q}>Was this helpful?</Text>
            <Text style={styles.qSub}>
              Rate your experience · 50 FK for your first feedback
            </Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => {
                const on = rating >= star;
                return (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                    style={[styles.star, on && styles.starOn]}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        fill={on ? Colors.primaryText : "none"}
                        stroke={Colors.primaryText}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.skip} accessibilityRole="button">
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={() => void submit()}
                disabled={saving}
                style={[styles.submit, { flex: 2 }, saving && { opacity: 0.6 }]}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.submitText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    ...{ position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 },
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    shadowColor: brand("#534AB7"),
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 16,
  },
  cardHead: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeadText: { fontSize: 13, fontWeight: "700", color: Colors.onPrimary },
  closeBtn: {
    height: 28,
    width: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: Colors.onPrimary, fontSize: 14 },
  body: { padding: 20 },
  q: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  qSub: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },
  stars: { flexDirection: "row", gap: 8, marginBottom: 14 },
  star: {
    height: 44,
    width: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  starOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryText },
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
  error: { fontSize: 12, color: Colors.errorText, marginTop: 6 },
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
  skipText: { fontSize: 13, color: Colors.textSecondary },
  submit: {
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { fontSize: 13, fontWeight: "700", color: Colors.onPrimary },
  doneBody: { padding: 24, alignItems: "center" },
  doneCircle: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  doneTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  doneFk: { fontSize: 13, color: Colors.primaryText, fontWeight: "600" },
  reviewCopy: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, textAlign: "center" },
}));
