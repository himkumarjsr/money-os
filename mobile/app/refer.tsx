/**
 * Refer & earn — port of web app/refer/page.tsx.
 */
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const SITE = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com"
).replace(/\/$/, "");

const STEPS = [
  ["1", "Share your link", "Send your unique link to friends."],
  ["2", "Friend signs up", "They create a Finkoin account."],
  [
    "3",
    "Both earn FK",
    "You get 200 FK on signup bonus flow; they get welcome FK.",
  ],
] as const;

function shortName(raw: string | null): string {
  const n = raw?.trim() || "Friend";
  const p = n.split(/\s+/);
  return p.length > 1
    ? `${p[0]} ${p[p.length - 1].charAt(0).toUpperCase()}.`
    : n;
}

export default function ReferScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referredNames, setReferredNames] = useState<string[]>([]);

  const referralUrl = useMemo(
    () => (code ? `${SITE}/?ref=${encodeURIComponent(code)}` : ""),
    [code],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data: me } = await supabase
          .from("users")
          .select("referral_code")
          .eq("id", userId)
          .maybeSingle();
        if (!cancelled && typeof me?.referral_code === "string") {
          setCode(me.referral_code);
        }

        const { count } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("referred_by", userId);
        if (!cancelled) setReferralCount(count ?? 0);

        const { data: refs } = await supabase
          .from("users")
          .select("name")
          .eq("referred_by", userId)
          .limit(25);
        if (!cancelled && refs) {
          setReferredNames(
            (refs as { name: string | null }[]).map((r) => shortName(r.name)),
          );
        }
      } catch {
        if (!cancelled) setReferralCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const shareMessage = `I've been using Finkoin to track my financial health. Check it out! ${referralUrl}`;

  const copy = async () => {
    if (!referralUrl) return;
    await Clipboard.setStringAsync(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = async () => {
    if (!referralUrl) return;
    const wa = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    try {
      await Linking.openURL(wa);
      return;
    } catch {
      // fall through to the system share sheet
    }
    await Share.share({ message: shareMessage });
  };

  return (
    <PageScaffold
      title="Refer & earn"
      subtitle="Share Finkoin. When friends join with your link, you both earn FK tokens."
      requireAuth
    >
      <View style={styles.linkBox}>
        <Text style={styles.linkText} selectable>
          {referralUrl || "Generating link…"}
        </Text>
        <Pressable
          onPress={() => void copy()}
          disabled={!referralUrl}
          style={[
            styles.copyBtn,
            copied && { backgroundColor: "#059669" },
            !referralUrl && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
        >
          {copied ? (
            <>
              <AppIcon name="check" size={16} color={Colors.onPrimary} />
              <Text style={styles.copyText}>Copied</Text>
            </>
          ) : (
            <Text style={styles.copyText}>Copy</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => void shareWhatsApp()}
        disabled={!referralUrl}
        style={[styles.waBtn, !referralUrl && { opacity: 0.5 }]}
        accessibilityRole="button"
      >
        <AppIcon name="phone" size={20} color={Colors.onPrimary} />
        <Text style={styles.waText}>Share on WhatsApp</Text>
      </Pressable>

      <Text style={[styles.h3, { marginTop: 32 }]}>How it works</Text>
      <View style={{ marginTop: 16, gap: 18 }}>
        {STEPS.map(([step, title, desc]) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{step}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.statsBox}>
        <Text style={styles.statsHead}>YOUR REFERRAL STATS</Text>
        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>
              {referralCount ?? "—"}
            </Text>
            <Text style={styles.statLabel}>Friends referred</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statNum, { color: Colors.success }]}>
              {(referralCount ?? 0) * 200}
            </Text>
            <Text style={styles.statLabel}>FK from referrals (est.)</Text>
          </View>
        </View>
      </View>

      {referredNames.length > 0 ? (
        <View style={{ marginTop: 28 }}>
          <Text style={styles.statsHead}>REFERRED USERS</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {referredNames.map((n, i) => (
              <View key={`${i}-${n}`} style={styles.refRow}>
                <Text style={styles.refText}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={pageStyles.footnote}>
        Bonuses apply when our referral processor runs after signup —{" "}
        <Text
          style={pageStyles.link}
          onPress={() => router.push("/legal/terms" as never)}
        >
          Terms
        </Text>
      </Text>
    </PageScaffold>
  );
}

const styles = themedStyles(() => ({
  linkBox: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  linkText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
  },
  copyText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
  waBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  waText: { color: Colors.onPrimary, fontSize: 16, fontWeight: "700" },
  h3: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  step: { flexDirection: "row", gap: 16 },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: Colors.onPrimary, fontWeight: "800", fontSize: 14 },
  stepTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  stepDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statsBox: {
    marginTop: 32,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 14,
    padding: 20,
  },
  statsHead: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  statNum: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  refRow: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refText: { fontSize: 14, color: Colors.textSecondary },
}));
