/**
 * Port of web `components/analyse/paywall-modal.tsx` as a bottom sheet.
 * Sells the Fix Plan (₹199, one year) through Google Play Billing / Apple
 * In-App Purchase; the server confirms each purchase before it unlocks.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FIX_PLAN_PRICE_INR, PAYMENTS_ENABLED } from "@/lib/analyseEntitlement";
import {
  buyFixPlan,
  fetchFixPlanPrice,
  isStoreBillingAvailable,
  resumePendingFixPlanPurchases,
} from "@/lib/fixPlanBilling";
import { fetchFixPlanAccess } from "@/lib/fixPlanAccess";
import { paywallConfirmLabel, paywallPriceNote } from "@/lib/paywallCopy";
import { useAuthStore } from "@/store/authStore";
import { Colors, themedStyles } from "@/constants/theme";

const DEFAULT_BULLETS = [
  "Complete priority plan",
  "Debt clearance strategy",
  "Step-by-step wealth builder plan",
  "Downloadable PDF report",
  "Insurance recommendations from Finkoin",
  "Also opens on finkoin.com with the same login",
];

type Props = {
  visible: boolean;
  onClose: () => void;
  priceLabel?: string;
  title?: string;
  subtitle?: string;
  bulletPoints?: string[];
};

export function PaywallSheet({
  visible,
  onClose,
  priceLabel,
  title = "Unlock your fix plan",
  subtitle = "Your complete AI roadmap is ready to unlock.",
  bulletPoints = DEFAULT_BULLETS,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState("");
  const priceNote = paywallPriceNote(PAYMENTS_ENABLED);

  useEffect(() => {
    if (!visible) {
      setError("");
      return;
    }
    if (PAYMENTS_ENABLED) void fetchFixPlanPrice().then(setStorePrice);
  }, [visible]);

  const openPlan = () => {
    onClose();
    router.push("/analyse/fixplan");
  };

  const handleConfirm = async () => {
    if (busy) return;
    if (!PAYMENTS_ENABLED) {
      openPlan();
      return;
    }
    if (!user?.id) {
      onClose();
      router.push({
        pathname: "/(auth)/login",
        params: { next: "/analyse/result" },
      });
      return;
    }
    if (!isStoreBillingAvailable()) {
      setError(
        "Payments work in the Play Store / App Store version of Finkoin.",
      );
      return;
    }
    setError("");
    setBusy("buy");
    const result = await buyFixPlan(user.id);
    setBusy(null);
    if (result.ok) openPlan();
    else if (result.error) setError(result.error);
  };

  // Already paid (here, on another phone, or the app closed mid-purchase).
  const handleRestore = async () => {
    if (busy || !user?.id) return;
    setError("");
    setBusy("restore");
    await resumePendingFixPlanPurchases();
    const access = await fetchFixPlanAccess(user);
    setBusy(null);
    if (access.hasAccess) openPlan();
    else setError("No purchase found for this account yet.");
  };

  const price =
    priceLabel ??
    (PAYMENTS_ENABLED
      ? `${storePrice ?? `₹${FIX_PLAN_PRICE_INR}`} for 1 year`
      : "Free");

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>F</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
          hitSlop={4}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.fk}>
        Finkoin Keys (FK) are rewards for activity on Finkoin. They do not
        reduce this unlock price and are not tied to buying any product here.
      </Text>

      <View style={styles.priceCard}>
        <Text style={styles.priceEyebrow}>Price</Text>
        <Text style={styles.price}>{price}</Text>
        {priceNote ? <Text style={styles.priceNote}>{priceNote}</Text> : null}
        {PAYMENTS_ENABLED ? (
          <Text style={styles.priceNote}>
            One-time payment, no auto-renewal.
          </Text>
        ) : null}
      </View>

      <View style={styles.bullets}>
        {bulletPoints.map((line) => (
          <Text key={line} style={styles.bullet}>
            ✓ {line}
          </Text>
        ))}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void handleConfirm()}
        disabled={busy !== null}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.cta,
          (pressed || busy === "buy") && { opacity: 0.9 },
        ]}
      >
        {busy === "buy" ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text style={styles.ctaText}>
            {paywallConfirmLabel({
              paymentsEnabled: PAYMENTS_ENABLED,
              priceInr: FIX_PLAN_PRICE_INR,
            })}
          </Text>
        )}
      </Pressable>

      {PAYMENTS_ENABLED && user?.id ? (
        <Pressable
          onPress={() => void handleRestore()}
          disabled={busy !== null}
          accessibilityRole="button"
          style={styles.restore}
          hitSlop={6}
        >
          <Text style={styles.restoreText}>
            {busy === "restore" ? "Checking…" : "Already paid? Restore"}
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.foot}>Educational only.</Text>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { fontSize: 18, fontWeight: "600", color: Colors.primaryText },
  title: { fontSize: 20, fontWeight: "600", color: Colors.textPrimary },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors.textSecondary },
  close: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  fk: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  priceCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  priceEyebrow: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  price: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
  priceNote: { marginTop: 4, fontSize: 13, color: Colors.textSecondary },
  bullets: { marginTop: 16, gap: 8 },
  bullet: { fontSize: 14, color: Colors.textSecondary },
  cta: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 15, fontWeight: "600", color: Colors.onPrimary },
  error: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.errorText,
    backgroundColor: Colors.errorLight,
  },
  restore: { marginTop: 12, alignItems: "center", paddingVertical: 6 },
  restoreText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  foot: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
  },
}));
