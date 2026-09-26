import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";

/** Mirrors the web /login?mode=reset flow: send a Supabase recovery email. */
export default function ForgotPasswordScreen() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <AppIcon name="bell" size={44} color={Colors.primary} />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a password reset link to {email}. Open it on this device to
          choose a new password.
        </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.link}>Back to login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.sub}>
            Enter your email and we will send a secure reset link.
          </Text>

          <View style={styles.form}>
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={loading ? "Sending…" : "Send reset link →"}
              onPress={() => void handleSend()}
              loading={loading}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 24, gap: Spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  sub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  form: { gap: Spacing.lg, marginTop: Spacing.lg },
  error: { color: Colors.error, fontSize: FontSize.md, fontWeight: "600" },
  link: { fontSize: FontSize.md, color: Colors.primary, fontWeight: "700" },
});
