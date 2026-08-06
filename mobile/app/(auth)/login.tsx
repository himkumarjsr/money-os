import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleSubmit = async () => {
    setFormError(null);
    if (!email.trim() || !password.trim()) {
      setFormError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setFormError(result.error);
        Alert.alert("Login failed", result.error);
        return;
      }
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      setFormError(msg);
      Alert.alert("Login failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setFormError(result.error);
        Alert.alert("Google sign-in", result.error);
      } else {
        router.replace("/(tabs)");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <BrandLogo size={80} />
          <Text style={styles.tagline}>Know it. Fix it. Grow it.</Text>
        </View>

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
          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button
            label={loading ? "Please wait…" : "Log in"}
            onPress={() => void handleSubmit()}
            loading={loading}
            disabled={loading || googleLoading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label={googleLoading ? "Opening Google…" : "Continue with Google"}
            variant="secondary"
            onPress={() => void handleGoogle()}
            loading={googleLoading}
            disabled={loading || googleLoading}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.linkWrap}
        >
          <Text style={styles.link}>
            ← Back to <Text style={styles.linkStrong}>home</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          style={styles.linkWrap}
        >
          <Text style={styles.link}>
            Need an account? <Text style={styles.linkStrong}>Sign up</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.privacy}>No PAN. No Aadhaar. Free forever.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 80, minHeight: "100%" as any },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing.xxxl,
  },
  tagline: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  form: { gap: Spacing.lg },
  error: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  linkWrap: { marginTop: Spacing.xl, alignItems: "center" },
  link: { fontSize: FontSize.md, color: Colors.textMuted },
  linkStrong: { color: Colors.primary, fontWeight: "700" },
  privacy: {
    textAlign: "center",
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
