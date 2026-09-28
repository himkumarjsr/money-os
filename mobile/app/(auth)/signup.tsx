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
import { useAuthStore, getOAuthRedirectUri } from "@/store/authStore";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

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
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
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
            disabled={loading || googleLoading}
          />
          <Button
            label={googleLoading ? "Opening Google…" : "Continue with Google"}
            variant="secondary"
            onPress={() => void handleGoogle()}
            loading={googleLoading}
            disabled={loading || googleLoading}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
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
  linkWrap: { marginTop: Spacing.xl, alignItems: "center" },
  link: { fontSize: FontSize.md, color: Colors.textMuted },
  linkStrong: { color: Colors.primary, fontWeight: "700" },
});
