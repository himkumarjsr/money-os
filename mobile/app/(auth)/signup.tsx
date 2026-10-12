import { useEffect, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, Spacing, FontSize, themedStyles } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppleSignInButton } from "@/components/ui/AppleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormError } from "@/components/ui/FormError";
import {
  AuthBrand,
  AuthModeSwitch,
  AuthHeading,
  AuthDivider,
  AuthSecurityFooter,
} from "@/components/auth/AuthChrome";
import {
  applyPendingReferral,
  savePendingReferral,
} from "@/components/auth/referral";
import { openContentHref } from "@/lib/contentLinks";

/** Only allow in-app paths as post-signup targets. */
function safeNext(next: unknown): Href {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//")
    ? (next as Href)
    : "/(tabs)";
}

export default function SignupScreen() {
  const { next, ref } = useLocalSearchParams<{ next?: string; ref?: string }>();
  const target = safeNext(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    void savePendingReferral(ref);
  }, [ref]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!email.trim()) {
      setFormError("Please enter your email");
      return;
    }
    if (!password.trim()) {
      setFormError("Please enter your password");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(
        name.trim(),
        email.trim(),
        password,
        typeof next === "string" ? next : undefined,
      );
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.needsConfirmation) {
        // Web: success message, switch to login mode, clear the password.
        router.replace({
          pathname: "/(auth)/login",
          params: {
            notice: "confirm",
            ...(next ? { next } : {}),
            ...(ref ? { ref } : {}),
          },
        });
        return;
      }
      await applyPendingReferral();
      router.replace(target);
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
        void applyPendingReferral();
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
        void applyPendingReferral();
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
          <AuthBrand />
          <AuthModeSwitch mode="signup" next={next} refCode={ref} />
          <AuthHeading
            title="Create account"
            subtitle="Join Indians taking control of finances."
          />

          <View style={styles.form}>
            <Input
              label="Your name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              label="Email address"
              placeholder="you@example.com"
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
              placeholder="Min 6 characters"
              value={password}
              onChangeText={setPassword}
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <FormError message={formError} />
            <Button
              label={loading ? "Please wait…" : "Create my account"}
              onPress={() => void handleSubmit()}
              loading={loading}
              disabled={busy}
            />
            <AuthDivider />
            <Button
              label={googleLoading ? "Opening Google…" : "Continue with Google"}
              variant="secondary"
              onPress={() => void handleGoogle()}
              loading={googleLoading}
              disabled={busy}
            />
            <AppleSignInButton
              mode="signUp"
              onPress={() => void handleApple()}
              disabled={busy}
            />
          </View>

          <Text style={styles.legalText}>
            By signing up you agree to our{" "}
            <Text
              style={styles.legalLink}
              onPress={() => openContentHref("/legal/terms")}
            >
              Terms
            </Text>{" "}
            and{" "}
            <Text
              style={styles.legalLink}
              onPress={() => openContentHref("/legal/privacy")}
            >
              Privacy Policy
            </Text>
            .{"\n"}We collect only financial numbers. No PAN or Aadhaar ever.
          </Text>

          <AuthSecurityFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 56, minHeight: "100%" as any },
  form: { gap: Spacing.lg },
  legalText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  legalLink: { color: Colors.primaryText, fontWeight: "600" },
}));
