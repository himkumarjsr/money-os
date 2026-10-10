import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/AppIcon";
import Button from "@/components/ui/Button";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
  themedStyles,
} from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";

const COLLECT = [
  "Income and salary numbers",
  "Monthly expense amounts",
  "Loan EMI amounts",
  "Insurance premium amounts",
  "Savings and investment values",
  "Age, city, and life stage",
] as const;

const NEVER = [
  "PAN card or Aadhaar number",
  "Bank account or IFSC details",
  "Credit or debit card numbers",
  "Passwords or OTPs",
  "Any government ID or document",
] as const;

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export function ConsentSheet({ onAccept, onDecline }: Props) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);

  return (
    <View
      style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View style={styles.handle} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWell}>
          <AppIcon name="lock" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Your data is safe with us</Text>
        <Text style={styles.lead}>
          Before we start, here is exactly what we collect and how we use it.
        </Text>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>What we collect</Text>
          {COLLECT.map((item) => (
            <View key={item} style={styles.row}>
              <View style={[styles.mark, styles.markOk]}>
                <Text style={styles.markOkText}>✓</Text>
              </View>
              <Text style={styles.rowText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.block, styles.blockWarn]}>
          <Text style={[styles.blockLabel, { color: Colors.warning }]}>
            We never ask for
          </Text>
          {NEVER.map((item) => (
            <View key={item} style={styles.row}>
              <View style={[styles.mark, styles.markNo]}>
                <Text style={styles.markNoText}>✗</Text>
              </View>
              <Text style={styles.rowText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyText}>
            Your data is used only to calculate your financial analysis and
            generate your personalized plan. We do not sell your personal
            financial data.
          </Text>
          <Pressable
            onPress={() => openContentHref("/legal/privacy")}
            hitSlop={8}
            style={{ marginTop: 8 }}
          >
            <Text style={styles.link}>Privacy policy</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setChecked((c) => !c)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            I understand and consent to Finkoin processing my entered financial
            data for analysis.
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Button
            label="Decline"
            variant="ghost"
            onPress={onDecline}
            fullWidth={false}
            style={styles.actionBtn}
          />
          <Button
            label="I Agree"
            onPress={onAccept}
            disabled={!checked}
            fullWidth={false}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  sheet: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 4,
  },
  scroll: {
    padding: 24,
    paddingTop: 8,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 28,
  },
  lead: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  block: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  blockWarn: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningLight,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  markOk: { backgroundColor: Colors.successLight },
  markNo: { backgroundColor: Colors.errorLight },
  markOkText: { fontSize: 11, color: Colors.success, fontWeight: "700" },
  markNoText: { fontSize: 11, color: Colors.error, fontWeight: "700" },
  rowText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  privacy: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  link: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkMark: { color: Colors.onPrimary, fontSize: 12, fontWeight: "800" },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
  },
}));
