/**
 * Privacy-aware amount - port of web `components/ui/PrivateAmount.tsx`.
 * Hidden ("₹••••••") by default; an eye button reveals it. When there is no
 * data (value 0 / not finite) the text is shown as-is with no toggle.
 */
import { useState } from "react";
import { Pressable, Text, View, type StyleProp, type TextStyle } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { EyeIcon } from "@/components/ui/PrivacyEye";

type Props = {
  value: number;
  display: string;
  label?: string;
  masked?: string;
  textStyle?: StyleProp<TextStyle>;
  eyeSize?: number;
};

export function PrivateAmount({
  value,
  display,
  label = "amount",
  masked = "₹••••••",
  textStyle,
  eyeSize = 16,
}: Props) {
  const [visible, setVisible] = useState(false);
  const hasData = Number.isFinite(value) && Math.abs(value) > 0;
  if (!hasData) return <Text style={textStyle}>{display}</Text>;
  return (
    <View style={styles.row}>
      <Text style={textStyle} numberOfLines={1}>
        {visible ? display : masked}
      </Text>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        style={[styles.eye, { width: eyeSize + 14, height: eyeSize + 14 }]}
      >
        <EyeIcon open={visible} size={eyeSize} color={Colors.primaryText} />
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  eye: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
}));
