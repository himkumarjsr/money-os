/**
 * A small calculator bubble that floats over every screen, like the iPhone
 * assistive-touch button: drag it anywhere, it snaps to the nearest side, and
 * a tap opens a pocket calculator next to it. Same keys and maths as the web
 * bubble (components/FloatingCalculator.tsx), from lib/quickCalc.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, themedStyles } from "@/constants/theme";
import {
  QUICK_CALC_KEYS,
  emptyQuickCalc,
  evaluateQuickCalc,
  formatQuickCalcExpr,
  formatQuickCalcNumber,
  pressQuickCalcKey,
  type QuickCalcKey,
} from "@/lib/quickCalc";
import { syncKv } from "@/lib/syncKv";

const SIZE = 52;
const EDGE = 8;
const PANEL_W = 248;
const PANEL_H = 340;
const POS_KEY = "finkoin_quick_calc_pos";
/** Moving less than this is a tap, not a drag. */
const TAP_SLOP = 6;

type Saved = { side: "left" | "right"; yRatio: number };

function readSaved(): Saved {
  try {
    const raw = syncKv.getItem(POS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if ((s.side === "left" || s.side === "right") && s.yRatio >= 0) return s;
    }
  } catch {
    /* bad value - use the default spot */
  }
  return { side: "right", yRatio: 0.62 };
}

export function FloatingCalculator() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState(emptyQuickCalc);
  const [side, setSide] = useState<Saved["side"]>(() => readSaved().side);
  const [y, setY] = useState(0);

  const minY = insets.top + 64;
  const maxY = height - insets.bottom - SIZE - 96;
  const clampY = (v: number) =>
    Math.min(Math.max(v, minY), Math.max(minY, maxY));
  const sideX = (s: Saved["side"]) =>
    s === "left" ? EDGE : width - SIZE - EDGE;

  const pos = useRef(new Animated.ValueXY()).current;
  /** Where the bubble rests (pos is animated, so it can't be read back). */
  const rest = useRef({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  // The pan handlers are made once; read the latest layout through a ref.
  const layout = useRef({ width, clampY, sideX });
  layout.current = { width, clampY, sideX };

  useEffect(() => {
    const s = readSaved();
    const startY = clampY(s.yRatio * height);
    rest.current = { x: sideX(s.side), y: startY };
    pos.setValue(rest.current);
    setSide(s.side);
    setY(startY);
    // Re-place on rotation / resize only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.hypot(g.dx, g.dy) >= TAP_SLOP,
        onPanResponderGrant: () => {
          origin.current = rest.current;
        },
        onPanResponderMove: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < TAP_SLOP) return;
          setOpen(false);
          pos.setValue({
            x: origin.current.x + g.dx,
            y: origin.current.y + g.dy,
          });
        },
        onPanResponderRelease: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < TAP_SLOP) {
            pos.setValue(origin.current);
            setOpen((o) => !o);
            return;
          }
          const { width: w, clampY: cy, sideX: sx } = layout.current;
          const nextSide: Saved["side"] =
            origin.current.x + g.dx + SIZE / 2 < w / 2 ? "left" : "right";
          const nextY = cy(origin.current.y + g.dy);
          // Snap to the nearer side, like the iPhone bubble.
          rest.current = { x: sx(nextSide), y: nextY };
          Animated.spring(pos, {
            toValue: rest.current,
            useNativeDriver: false,
            friction: 7,
          }).start();
          setSide(nextSide);
          setY(nextY);
          syncKv.setItem(
            POS_KEY,
            JSON.stringify({ side: nextSide, yRatio: nextY / height }),
          );
        },
        onPanResponderTerminate: () => {
          pos.setValue(origin.current);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height],
  );

  const press = (key: QuickCalcKey) =>
    setCalc((s) => pressQuickCalcKey(s, key));

  const preview =
    !calc.justEvaluated && /[+−×÷%]/.test(calc.expr.replace(/^−/, ""))
      ? evaluateQuickCalc(calc.expr)
      : null;
  const shown = calc.expr ? formatQuickCalcExpr(calc.expr) : "0";

  // Phones are too narrow to fit the panel beside the bubble, so it sits
  // above the bubble when that's in the lower half, else below.
  const panelTop =
    y > height / 2
      ? Math.max(y - PANEL_H - 10, insets.top + 8)
      : Math.min(y + SIZE + 10, height - insets.bottom - PANEL_H - 8);
  const panelLeft =
    width >= SIZE + PANEL_W + 32
      ? side === "left"
        ? EDGE + SIZE + 8
        : width - EDGE - SIZE - 8 - PANEL_W
      : (width - PANEL_W) / 2;

  return (
    <>
      {open ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close calculator"
        />
      ) : null}
      {open ? (
        <View
          style={[styles.panel, { top: panelTop, left: panelLeft }]}
          accessibilityLabel="Calculator"
        >
          <View style={styles.display} accessibilityLiveRegion="polite">
            <Text style={styles.small} numberOfLines={1}>
              {calc.last ? `${formatQuickCalcExpr(calc.last)} =` : " "}
            </Text>
            <Text
              style={[styles.big, shown.length > 14 && styles.bigLong]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {shown}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {preview !== null ? `= ${formatQuickCalcNumber(preview)}` : " "}
            </Text>
          </View>
          {QUICK_CALC_KEYS.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((key) => {
                const op = "+−×÷".includes(key);
                const fn = key === "C" || key === "⌫" || key === "%";
                return (
                  <Pressable
                    key={key}
                    onPress={() => press(key)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      key === "⌫" ? "Delete" : key === "C" ? "Clear" : key
                    }
                    style={({ pressed }) => [
                      styles.key,
                      key === "=" && styles.keyWide,
                      key === "="
                        ? styles.keyEq
                        : op
                          ? styles.keyOp
                          : fn
                            ? styles.keyFn
                            : styles.keyNum,
                      pressed && styles.keyPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.keyText,
                        key === "="
                          ? styles.keyEqText
                          : op
                            ? styles.keyOpText
                            : null,
                      ]}
                    >
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
      <Animated.View
        {...pan.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={open ? "Close calculator" : "Open calculator"}
        onAccessibilityTap={() => setOpen((o) => !o)}
        style={[
          styles.bubble,
          { opacity: open ? 1 : 0.85, transform: pos.getTranslateTransform() },
        ]}
      >
        <MaterialCommunityIcons
          name={open ? "close" : "calculator-variant-outline"}
          size={open ? 22 : 26}
          color="#FFFFFF"
        />
      </Animated.View>
    </>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  bubble: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 100,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "rgba(60, 52, 137, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14103C",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  panel: {
    position: "absolute",
    zIndex: 95,
    width: PANEL_W,
    padding: 12,
    borderRadius: 24,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  display: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "flex-end",
  },
  small: { fontSize: 12, color: Colors.textSecondary },
  big: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bigLong: { fontSize: 18 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  key: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keyWide: { flex: 2.15 },
  keyNum: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyFn: { backgroundColor: Colors.surfaceAlt },
  keyOp: { backgroundColor: Colors.primaryLight },
  keyEq: { backgroundColor: Colors.primary },
  keyPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  keyText: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  keyOpText: { color: Colors.primary },
  keyEqText: { color: Colors.onPrimary },
}));
