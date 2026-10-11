import { View, type ViewStyle } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { BrandCoin } from "@/components/ui/BrandCoin";
import { GoldText } from "@/components/ui/GoldMirror";

type Props = {
  size?: number;
  /** Navbar-style: icon + purple “Finkoin” (matches web GlobalNavbar) */
  withWordmark?: boolean;
  style?: ViewStyle;
};

export function BrandLogo({ size = 32, withWordmark = false, style }: Props) {
  return (
    <View style={[withWordmark ? styles.row : styles.wrap, style]}>
      <BrandCoin size={size} />
      {withWordmark ? (
        <GoldText style={styles.wordmark} numberOfLines={1}>
          Finkoin
        </GoldText>
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
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
}));
