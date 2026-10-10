/**
 * Animated intro that takes over from the static native splash (Android and
 * iOS only allow a still image there). It starts on the same purple "FK" frame,
 * then settles into the logo, ring and wordmark, and fades out once the app is ready.
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
import { FINKOIN_TAGLINE } from "@/constants/theme";

const SPLASH_BG = "#534AB7"; // matches app.json splash backgroundColor
const MIN_VISIBLE_MS = 1700;

type Props = {
  /** App finished loading; the intro may leave once its animation has played. */
  ready: boolean;
  /** Ring colour: white normally, gold for the premium theme. */
  accent?: string;
};

export function AnimatedSplash({ ready, accent = "#FFFFFF" }: Props) {
  const { width } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const [minDone, setMinDone] = useState(false);

  const mark = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(mark, {
          toValue: 1,
          duration: 650,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 700,
          delay: 250,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(words, {
          toValue: 1,
          duration: 550,
          delay: 450,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
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
  }, [mark, ring, words, pulse]);

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

  // Native splash shows "FK" at roughly a third of the screen width.
  const startSize = width * 0.36;
  const endScale = 0.42;
  const ringSize = startSize * 1.7;

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
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: accent,
              opacity: Animated.multiply(
                ring,
                pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 0.55],
                }),
              ),
              transform: [
                {
                  scale: Animated.add(
                    ring.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4 / endScale, 1],
                    }),
                    pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.06],
                    }),
                  ),
                },
                { scale: endScale },
              ],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.mark,
            {
              fontSize: startSize,
              lineHeight: startSize * 1.1,
              transform: [
                {
                  scale: mark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, endScale],
                  }),
                },
              ],
            },
          ]}
          allowFontScaling={false}
        >
          FK
        </Animated.Text>
      </View>

      <Animated.View
        style={[
          styles.words,
          {
            top: "50%",
            marginTop: (ringSize * endScale) / 2 + 28,
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
        <Text style={styles.wordmark} allowFontScaling={false}>
          Finkoin
        </Text>
        <Text style={styles.tagline} allowFontScaling={false}>
          {FINKOIN_TAGLINE}
        </Text>
      </Animated.View>
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
  ring: {
    position: "absolute",
    borderWidth: 6,
  },
  mark: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
  },
  words: {
    position: "absolute",
    left: 0,
    right: 0,
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
});
