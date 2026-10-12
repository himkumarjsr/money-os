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
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize, themedStyles } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormError } from "@/components/ui/FormError";

/** Reached from the password-recovery email via auth/callback?type=recovery. */
export default function UpdatePasswordScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const hasSessionError = !isLoggedIn;

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
          <View style={styles.form}>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>Use at least 6 characters.</Text>
            {hasSessionError ? (
              <>
                <FormError message="Your reset link is invalid or has expired." />
                <TouchableOpacity
                  onPress={() => router.replace("/(auth)/forgot-password")}
                  style={styles.linkWrap}
                >
                  <Text style={styles.linkStrong}>
                    Request a new reset link
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <PasswordInput
                  label="New password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChangeText={setConfirm}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
                <FormError message={formError} />
                <Button
                  label={loading ? "Saving…" : "Update password"}
                  onPress={() => void handleSubmit()}
                  loading={loading}
                  disabled={loading}
                />
              </>
            )}
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={styles.linkWrap}
            >
              <Text style={styles.linkStrong}>Back to login</Text>
            </TouchableOpacity>
          </View>
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
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: "center",
  },
  linkWrap: { alignItems: "center" },
  linkStrong: {
    color: Colors.primaryText,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
}));
