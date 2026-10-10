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
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAuthStore, getOAuthRedirectUri } from "@/store/authStore";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppleSignInButton } from "@/components/ui/AppleSignInButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
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
  const { next } = useLocalSearchParams<{ next?: string }>();
  const target = safeNext(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill name, email and password");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(name.trim(), email.trim(), password);
      if (result.error) {
        Alert.alert("Sign up failed", result.error);
      } else {
        Alert.alert(
          "Check your email",
          "We sent a verification link. Please verify then log in.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace({
                  pathname: "/(auth)/login",
                  params: next ? { next } : {},
                }),
            },
          ],
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        Alert.alert("Google sign-in", result.error);
      } else {
        router.replace(target);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result.error) {
        if (!/cancelled/i.test(result.error)) {
          Alert.alert("Apple sign-in", result.error);
        }
      } else {
        router.replace(target);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const busy = loading || googleLoading || appleLoading;

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
          <Text style={styles.appName}>Create account</Text>
          <Text style={styles.tagline}>Same Finkoin as the web</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Your name"
            placeholder="Himanshu Kumar"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            placeholder="you@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            placeholder="Min 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            label={loading ? "Please wait…" : "Create account"}
            onPress={() => void handleSubmit()}
            loading={loading}
            disabled={busy}
          />
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
          .
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: "/(auth)/login",
              params: next ? { next } : {},
            })
          }
          style={styles.linkWrap}
        >
          <Text style={styles.link}>
            Have an account? <Text style={styles.linkStrong}>Log in</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.linkWrap}
        >
          <Text style={styles.link}>
            ← Back to <Text style={styles.linkStrong}>home</Text>
          </Text>
        </TouchableOpacity>
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
  appName: {
    marginTop: Spacing.md,
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tagline: { fontSize: FontSize.md, color: Colors.textMuted },
  form: { gap: Spacing.lg },
  legalText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  legalLink: { color: Colors.primary, fontWeight: "600" },
  linkWrap: { marginTop: Spacing.xl, alignItems: "center" },
  link: { fontSize: FontSize.md, color: Colors.textMuted },
  linkStrong: { color: Colors.primary, fontWeight: "700" },
});
