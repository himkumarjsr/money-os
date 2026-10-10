import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
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

  if (!isLoggedIn) return <Redirect href="/(auth)/login" />;

  const handleSubmit = async () => {
    setFormError(null);
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match");
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
            <Text style={styles.title}>Set a new password</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
}));
