import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize, themedStyles } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { FormError } from "@/components/ui/FormError";
import { AppIcon } from "@/components/ui/AppIcon";

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const backToLogin = () =>
    router.canGoBack() ? router.back() : router.replace("/(auth)/login");

  const handleSubmit = async () => {
    setFormError(null);
    if (!email.trim()) {
      setFormError("Enter your email");
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <BrandLogo size={64} />
          </View>

          {sent ? (
            <View style={styles.success}>
              <AppIcon name="mail" size={44} color={Colors.primary} />
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a password reset link to {email.trim()}. Open it on this
                phone to set a new password.
              </Text>
              <Button label="Back to login" onPress={backToLogin} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>
                Enter the email you signed up with and we'll send you a reset
                link.
              </Text>
              <Input
                label="Email"
                placeholder="you@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />
              <FormError message={formError} />
              <Button
                label={loading ? "Sending…" : "Send reset link"}
                onPress={() => void handleSubmit()}
                loading={loading}
                disabled={loading}
              />
              <TouchableOpacity onPress={backToLogin} style={styles.linkWrap}>
                <Text style={styles.link}>
                  ← Back to <Text style={styles.linkStrong}>login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 56, flexGrow: 1 },
  logoContainer: { alignItems: "center", marginBottom: Spacing.xxl },
  form: { gap: Spacing.lg },
  success: { gap: Spacing.lg, alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  linkWrap: { marginTop: Spacing.md, alignItems: "center" },
  link: { fontSize: FontSize.md, color: Colors.textMuted },
  linkStrong: { color: Colors.primary, fontWeight: "700" },
}));
