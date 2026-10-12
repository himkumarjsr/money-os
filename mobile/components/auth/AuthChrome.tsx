/**
 * Shared pieces of the login / sign-up screens, matching web `app/login`:
 * FK brand tile, Login | Sign up switch, "or continue with" divider and the
 * "256-bit encrypted" footer.
 */
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import {
  Colors,
  Spacing,
  Radius,
  FontSize,
  themedStyles,
} from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";

export function AuthBrand() {
  return (
    <View style={styles.brand}>
      <View style={styles.tile}>
        <Text style={styles.tileText}>FK</Text>
      </View>
      <Text style={styles.wordmark}>Finkoin</Text>
    </View>
  );
}

export function AuthModeSwitch({
  mode,
  next,
  refCode,
}: {
  mode: "login" | "signup";
  next?: string;
  refCode?: string;
}) {
  const params: Record<string, string> = {};
  if (next) params.next = next;
  if (refCode) params.ref = refCode;
  const go = (m: "login" | "signup") => {
    if (m === mode) return;
    router.replace({
      pathname: m === "login" ? "/(auth)/login" : "/(auth)/signup",
      params,
    });
  };
  return (
    <View style={styles.switchWrap}>
      {(
        [
          { key: "login", label: "Login" },
          { key: "signup", label: "Sign up" },
        ] as const
      ).map((tab) => {
        const active = mode === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => go(tab.key)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function AuthSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.success} accessibilityRole="alert">
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or continue with</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthSecurityFooter() {
  return (
    <View style={styles.footer}>
      <AppIcon name="lock" size={14} color={Colors.primaryText} />
      <Text style={styles.footerText}>
        256-bit encrypted · Secured by Supabase
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { color: Colors.onPrimary, fontWeight: "800", fontSize: 16 },
  wordmark: { fontSize: 22, fontWeight: "800", color: Colors.primaryText },
  switchWrap: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  tabTextActive: { color: Colors.onPrimary, fontWeight: "700" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
  success: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  successText: {
    color: Colors.successText,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.xs, color: Colors.textMuted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.lg,
  },
  footerText: { fontSize: FontSize.xs, color: Colors.textMuted },
}));
