/**
 * Animated intro that takes over from the static native splash (Android and
 * iOS only allow a still image there). It starts on the native splash's FK
 * coin, fades into the theme's backdrop while the coin flips twice and
 * settles, then the wordmark rises. It fades out once the app is ready.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  FINKOIN_TAGLINE,
  HERO_GRADIENT,
  type ThemeName,
} from "@/constants/theme";
import { BrandCoin } from "@/components/ui/BrandCoin";
import { GoldText } from "@/components/ui/GoldMirror";

const SPLASH_BG = "#534AB7"; // matches app.json splash backgroundColor
const MIN_VISIBLE_MS = 1900;

const BACKDROP: Record<ThemeName, string> = {
  light: "linear-gradient(165deg, #5F56C4 0%, #534AB7 48%, #3C3489 100%)",
  dark: "linear-gradient(160deg, #1E1A44 0%, #12102A 55%, #1A1638 100%)",
  premium: HERO_GRADIENT,
};

type Props = {
  /** App finished loading; the intro may leave once its animation has played. */
  ready: boolean;
  /** Theme to paint the backdrop and coin with. */
  theme: ThemeName;
};

/** The theme backdrop; fades in over the native purple when it mounts. */
function Backdrop({ theme }: { theme: ThemeName }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: fade,
          backgroundColor: SPLASH_BG,
          experimental_backgroundImage: BACKDROP[theme],
        },
      ]}
    />
  );
}

export function AnimatedSplash({ ready, theme }: Props) {
  const { width } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const [minDone, setMinDone] = useState(false);

  const coin = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(coin, {
        toValue: 1,
        duration: 1300,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(words, {
        toValue: 1,
        duration: 550,
        delay: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // While the app is still loading, the coin turns once every few seconds.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(spin, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => {
      setMinDone(true);
      loop.start();
    }, MIN_VISIBLE_MS);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [coin, words, spin]);

  useEffect(() => {
    if (!ready || !minDone) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: 380,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setGone(true));
  }, [ready, minDone, exit]);

  if (gone) return null;

  const coinSize = Math.min(width * 0.34, 150);
  const premium = theme === "premium";

  return (
    <Animated.View
      pointerEvents={ready && minDone ? "none" : "auto"}
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          opacity: exit.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              scale: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.06],
              }),
            },
          ],
        },
      ]}
      accessibilityLabel="Finkoin is loading"
    >
      {/* Keyed so a theme that resolves late fades in rather than snapping. */}
      <Backdrop key={theme} theme={theme} />

      <View style={styles.center}>
        <Animated.View
          style={{
            transform: [
              { perspective: 800 },
              {
                scale: coin.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.82, 1],
                }),
              },
              {
                rotateY: Animated.add(
                  coin.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-720, 0],
                  }),
                  spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 360],
                  }),
                ).interpolate({
                  inputRange: [-720, 360],
                  outputRange: ["-720deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <BrandCoin size={coinSize} theme={theme} />
        </Animated.View>

        <Animated.View
          style={[
            styles.words,
            {
              opacity: words,
              transform: [
                {
                  translateY: words.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {premium ? (
            <GoldText style={styles.wordmark} always>
              Finkoin
            </GoldText>
          ) : (
            <Text style={styles.wordmark} allowFontScaling={false}>
              Finkoin
            </Text>
          )}
          <Text
            style={[styles.tagline, premium && styles.taglinePremium]}
            allowFontScaling={false}
          >
            {FINKOIN_TAGLINE}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: SPLASH_BG,
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  words: {
    marginTop: 28,
    alignItems: "center",
    gap: 6,
  },
  wordmark: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  taglinePremium: {
    color: "#BFB38A",
  },
});
