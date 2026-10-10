import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/ui/FormError";
import { Colors, Spacing, themedStyles } from "@/constants/theme";
import { deleteMyAccount } from "@/lib/accountDeletion";
import { useAuthStore } from "@/store/authStore";

const CONFIRM_WORD = "DELETE";

/** Type-DELETE confirmation (PWA uses window.prompt) before calling the delete API. */
export function DeleteAccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const signOut = useAuthStore((s) => s.signOut);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTyped("");
      setError(null);
    }
  }, [visible]);

  const confirmed = typed.trim() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: delError } = await deleteMyAccount();
      if (delError) {
        setError(delError);
        return;
      }
      await signOut();
      onClose();
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onClose} scroll>
      <Text style={styles.title}>Delete account permanently?</Text>
      <Text style={styles.sub}>
        This removes your profile, tracker history, analyse results, Split data
        and all other Finkoin data. This cannot be undone.
      </Text>
      <View style={styles.form}>
        <Input
          label={`Type ${CONFIRM_WORD} to confirm`}
          placeholder={CONFIRM_WORD}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />
        <FormError message={error} />
        <Button
          label={busy ? "Deleting…" : "Delete account permanently"}
          variant="danger"
          onPress={() => void handleDelete()}
          loading={busy}
          disabled={!confirmed || busy}
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={onClose}
          disabled={busy}
        />
      </View>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  title: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  sub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  form: { gap: Spacing.lg, marginTop: Spacing.lg },
}));
