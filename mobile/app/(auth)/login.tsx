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
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        Alert.alert("Login failed", result.error);
      } else {
        router.replace("/(tabs)/home");
      }
    } finally {
      setLoading(false);
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
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>FK</Text>
          </View>
          <Text style={styles.appName}>Finkoin</Text>
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
          />
          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            label={loading ? "Please wait…" : "Log in"}
            onPress={() => void handleSubmit()}
            loading={loading}
            disabled={loading}
          />
        </View>

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
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadow.strong,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  appName: {
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
  privacy: {
    textAlign: "center",
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
