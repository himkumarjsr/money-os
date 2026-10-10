import { View, Image, Text, type ViewStyle } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

const logoSource = require("@/assets/logo.png");

type Props = {
  size?: number;
  /** Navbar-style: icon + purple “Finkoin” (matches web GlobalNavbar) */
  withWordmark?: boolean;
  style?: ViewStyle;
};

export function BrandLogo({ size = 32, withWordmark = false, style }: Props) {
  return (
    <View style={[withWordmark ? styles.row : styles.wrap, style]}>
      <Image
        source={logoSource}
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
        resizeMode="contain"
        accessibilityLabel="Finkoin"
        // Web a11y (lint); RN uses accessibilityLabel above
        alt="Finkoin"
      />
      {withWordmark ? (
        <Text style={styles.wordmark} numberOfLines={1}>
          Finkoin
        </Text>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
}));
