import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { BrandCoin } from "@/components/ui/BrandCoin";

/** The FK coin turning on its edge, like the PWA's BrandPageLoader. */
export function CoinSpinner({ size = 48 }: { size?: number }) {
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{
        transform: [
          { perspective: 600 },
          {
            rotateY: turn.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    >
      <BrandCoin size={size} />
    </Animated.View>
  );
}

export function LoadingSpinner({ full }: { full?: boolean }) {
  return (
    <View style={[styles.wrap, full && styles.full]}>
      <CoinSpinner />
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { alignItems: "center", justifyContent: "center", padding: 24 },
  full: { flex: 1, backgroundColor: Colors.background },
}));
