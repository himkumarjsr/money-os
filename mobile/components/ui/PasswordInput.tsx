import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  type TextInputProps,
} from "react-native";
import { Colors, FontSize, themedStyles } from "@/constants/theme";
import { Input } from "@/components/ui/Input";

type Props = Omit<TextInputProps, "secureTextEntry"> & {
  label?: string;
  error?: string;
};

/** `Input` with a Show/Hide toggle. */
function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Input
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        style={[styles.toggle, props.label ? styles.toggleWithLabel : null]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = themedStyles(() => ({
  input: { paddingRight: 56 },
  toggle: {
    position: "absolute",
    right: 16,
    top: 0,
    height: 52,
    justifyContent: "center",
  },
  // Label row (FontSize.md line + 6 gap) sits above the input box.
  toggleWithLabel: { top: FontSize.md + 10 },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
}));

export { PasswordInput };
export default PasswordInput;
