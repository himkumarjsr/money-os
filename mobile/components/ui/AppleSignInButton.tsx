import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Radius } from "@/constants/theme";
import { isAppleSignInAvailable } from "@/lib/appleAuth";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  mode?: "signIn" | "signUp";
};

/** Apple's own button (required by its design rules); renders nothing off iOS. */
export function AppleSignInButton({ onPress, disabled, mode = "signIn" }: Props) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isAppleSignInAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  return (
    <View
      style={disabled ? styles.disabled : undefined}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          mode === "signUp"
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
        }
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={Radius.lg}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: "100%", height: 52 },
  disabled: { opacity: 0.5 },
});
