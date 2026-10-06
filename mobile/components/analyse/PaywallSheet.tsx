/**
 * Port of web `components/analyse/paywall-modal.tsx` as a bottom sheet.
 * Payments are not live on mobile: confirming never charges and never writes
 * subscriptionTier — it just closes and opens the Fix Plan.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FIX_PLAN_PRICE_INR } from "@/lib/analyseEntitlement";
import { Colors } from "@/constants/theme";

const DEFAULT_BULLETS = [
  "Complete priority plan",
  "Debt clearance strategy",
  "12-month action roadmap",
  "Downloadable PDF report",
  "Insurance recommendations from Finkoin",
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
  priceLabel = `Pay ₹${FIX_PLAN_PRICE_INR}`,
  title = "Unlock your fix plan",
  subtitle = "Your complete AI roadmap is ready to unlock.",
  bulletPoints = DEFAULT_BULLETS,
}: Props) {
  const handleConfirm = () => {
    onClose();
    router.push("/analyse/fixplan");
  };

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
        <Text style={styles.price}>{priceLabel}</Text>
      </View>

      <View style={styles.bullets}>
        {bulletPoints.map((line) => (
          <Text key={line} style={styles.bullet}>
            ✓ {line}
          </Text>
        ))}
      </View>

      <Pressable
        onPress={handleConfirm}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.ctaText}>Confirm and unlock</Text>
      </Pressable>

      <Text style={styles.foot}>Educational only.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  avatarText: { fontSize: 18, fontWeight: "600", color: Colors.primary },
  title: { fontSize: 20, fontWeight: "600", color: "#0F172A" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#475569" },
  close: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
  fk: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: "#454442",
  },
  priceCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    backgroundColor: "#FAFAFE",
    padding: 16,
  },
  priceEyebrow: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#7A7871",
  },
  price: { fontSize: 24, fontWeight: "700", color: "#111110" },
  bullets: { marginTop: 16, gap: 8 },
  bullet: { fontSize: 14, color: "#334155" },
  cta: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  foot: { marginTop: 12, textAlign: "center", fontSize: 12, color: "#9B9A94" },
});
