/**
 * Share control matching web `components/ui/ShareButton.tsx`: rounded-xl bordered
 * button with a share glyph and the label "Share". After a completed share it
 * shows "Shared" (green) for 2 seconds.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, Share, Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Colors, themedStyles } from "@/constants/theme";

type Props = {
  /** Shared as the message/title text (web passes the title only). */
  title: string;
  /** Absolute URL, passed separately from the message. */
  url: string;
  text?: string;
};

export function ShareButton({ title, url, text = "Share" }: Props) {
  const [shared, setShared] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onPress = async () => {
    try {
      const res = await Share.share({ title, message: title, url });
      if (res.action === Share.dismissedAction) return;
      setShared(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShared(false), 2000);
    } catch {
      // Share unavailable.
    }
  };

  const label = shared ? "Shared" : text;
  const color = shared ? Colors.successText : Colors.textPrimary;

  return (
    <Pressable
      onPress={() => void onPress()}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        shared && styles.btnOk,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="18" cy="5" r="3" />
        <Circle cx="6" cy="12" r="3" />
        <Circle cx="18" cy="19" r="3" />
        <Path d="M8.59 13.51 15.42 17.49" />
        <Path d="m15.41 6.51-6.82 3.98" />
      </Svg>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  btnOk: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  text: { fontSize: 14, fontWeight: "600" },
}));
