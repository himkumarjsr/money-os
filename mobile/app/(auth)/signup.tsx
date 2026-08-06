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

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

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
            disabled={loading}
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
});
