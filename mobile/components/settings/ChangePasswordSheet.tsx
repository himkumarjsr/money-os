import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormError } from "@/components/ui/FormError";
import { Colors, Spacing, themedStyles } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

/** Set a new password for the signed-in session (no email round-trip). */
export function ChangePasswordSheet({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <Text style={styles.title}>Change password</Text>
      <Text style={styles.sub}>
        Works for Google sign-ins too — it adds a password to your account.
      </Text>
      <View style={styles.form}>
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
        <FormError message={error} />
        <Button
          label={saving ? "Saving…" : "Update password"}
          onPress={() => void handleSave()}
          loading={saving}
          disabled={saving}
        />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  title: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  sub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
  },
  form: { gap: Spacing.lg, marginTop: Spacing.lg },
}));
