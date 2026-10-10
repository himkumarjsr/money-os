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
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppleSignInButton } from "@/components/ui/AppleSignInButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormError } from "@/components/ui/FormError";

/** Only allow in-app paths as post-login targets. */
function safeNext(next: unknown): Href {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? (next as Href)
    : "/(tabs)";
}

function friendlyAuthError(msg: string): string {
  return /invalid/i.test(msg) ? "Wrong email or password. Try again." : msg;
}

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const target = safeNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    if (!email.trim()) {
      setFormError("Please enter your email");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setFormError(friendlyAuthError(result.error));
        return;
      }
      router.replace(target);
    } catch (e) {
      setFormError(
        friendlyAuthError(e instanceof Error ? e.message : "Sign in failed"),
      );
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
      } else {
        router.replace(target);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    setFormError(null);
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result.error) {
        if (!/cancelled/i.test(result.error)) setFormError(result.error);
      } else {
        router.replace(target);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const busy = loading || googleLoading || appleLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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
            <PasswordInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(auth)/forgot-password",
                  params: email.trim() ? { email: email.trim() } : {},
                })
              }
              style={styles.forgotWrap}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>
            <FormError message={formError} />
            <Button
              label={loading ? "Please wait…" : "Log in"}
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={busy}
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
              disabled={busy}
            />
            <AppleSignInButton
              onPress={() => void handleApple()}
              disabled={busy}
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
            onPress={() =>
              router.push({
                pathname: "/(auth)/signup",
                params: next ? { next } : {},
              })
            }
            style={styles.linkWrap}
          >
            <Text style={styles.link}>
              Need an account? <Text style={styles.linkStrong}>Sign up</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.privacy}>No PAN. No Aadhaar. Free forever.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 56, minHeight: "100%" as any },
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
  forgotWrap: { alignSelf: "flex-end", marginTop: -Spacing.sm },
  forgot: { fontSize: FontSize.md, color: Colors.primary, fontWeight: "700" },
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
