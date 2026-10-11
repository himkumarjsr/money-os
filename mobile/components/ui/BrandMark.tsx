/**
 * PWA GlobalNavbar brand: the FK coin and the "Finkoin" wordmark.
 * Premium paints both with the shiny gold gradient and the free themes with
 * Violet Satin, like the web navbar.
 */
import { GoldText } from "@/components/ui/GoldMirror";
import { BrandCoin } from "@/components/ui/BrandCoin";
import { Colors, themedStyles } from "@/constants/theme";

/** The header mark: the FK coin (gold for Premium members in any theme). */
export function BrandTile({ size = 32 }: { size?: number }) {
  return <BrandCoin size={size} />;
}

const FONT_SIZE = 18;
const LINE_HEIGHT = 22;

/** Gold mirror in Premium, Violet Satin in the free themes. */
export function BrandWordmark() {
  return (
    <GoldText style={styles.wordmark} numberOfLines={1}>
      Finkoin
    </GoldText>
  );
}

const styles = themedStyles(() => ({
  wordmark: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontWeight: "700",
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
}));
