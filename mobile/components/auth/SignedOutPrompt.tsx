/**
 * Shared signed-out state for tabs that need an account (Report, Track…).
 * Brand coin in a soft tinted halo, a short pitch, three benefit rows and
 * "Log in" / "Create free account" actions, vertically centred so the page
 * never looks half-empty. All colours come from theme tokens so text meets
 * WCAG AA in the light, dark and premium themes.
 */
import { View, Text, ScrollView } from "react-native";
import { router, type Href } from "expo-router";
import {
  Colors,
  Spacing,
  Radius,
  FontSize,
  themedStyles,
} from "@/constants/theme";
import { BrandCoin } from "@/components/ui/BrandCoin";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import Button from "@/components/ui/Button";

export type SignedOutBenefit = {
  icon: AppIconName;
  text: string;
};

type Props = {
  /** Small badge icon on the brand coin, hinting at the screen's purpose. */
  icon?: AppIconName;
  title: string;
  subtitle: string;
  benefits: readonly SignedOutBenefit[];
  /** Route to return to after logging in or signing up. */
  next?: string;
  /** Extra bottom padding so content clears the floating tab bar. */
  bottomInset?: number;
};

export function SignedOutPrompt({
  icon,
  title,
  subtitle,
  benefits,
  next,
  bottomInset = 120,
}: Props) {
  const params = next ? { next } : undefined;
  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.inner}>
        <View style={styles.hero}>
          <View style={styles.halo}>
            <BrandCoin size={68} />
          </View>
          {icon ? (
            <View style={styles.badge}>
              <AppIcon name={icon} size={18} color={Colors.primaryText} />
            </View>
          ) : null}
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.benefits}>
          {benefits.map((b, i) => (
            <View
              key={b.text}
              style={[styles.benefitRow, i > 0 && styles.benefitDivider]}
            >
              <View style={styles.benefitIcon}>
                <AppIcon name={b.icon} size={18} color={Colors.primaryText} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Log in"
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params,
            } as Href)
          }
          style={styles.primaryBtn}
        />
        <Button
          label="Create free account"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/(auth)/signup",
              params,
            } as Href)
          }
          style={styles.secondaryBtn}
        />
        <Text style={styles.fine}>Free to start · Takes under a minute</Text>
      </View>
    </ScrollView>
  );
}

export default SignedOutPrompt;

const styles = themedStyles(() => ({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  inner: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    alignItems: "center",
  },
  hero: {
    marginBottom: Spacing.xxl,
  },
  halo: {
    width: 112,
    height: 112,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  benefits: {
    alignSelf: "stretch",
    marginTop: Spacing.xxl,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
  },
  benefitDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: Spacing.xxl,
    minHeight: 52,
    alignSelf: "stretch",
  },
  secondaryBtn: {
    marginTop: Spacing.md,
    minHeight: 52,
    alignSelf: "stretch",
  },
  fine: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
}));
