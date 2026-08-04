import { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; amount: number }) => void;
};

export function AddExpenseSheet({ visible, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  function handleSave() {
    if (!title.trim() || !(amount && amount > 0)) return;
    onSave({ title: title.trim(), amount });
    setTitle("");
    setAmount(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add expense</Text>
          <Input
            label="What for?"
            value={title}
            onChangeText={setTitle}
            placeholder="Groceries, Uber…"
          />
          <View style={{ height: Spacing.md }} />
          <MoneyInput
            label="Amount (₹)"
            value={amount}
            onChangeValue={setAmount}
            placeholder="0"
          />
          <View style={{ height: Spacing.lg }} />
          <Button label="Save" onPress={handleSave} />
          <TouchableOpacity onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,16,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    ...Shadow.strong,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  cancel: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
  cancelText: { color: Colors.textMuted, fontWeight: "600" },
});
