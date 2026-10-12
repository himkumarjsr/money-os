/**
 * Basic four-function calculator — port of web `app/calculator/page.tsx`.
 */
import { useCallback, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";

function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  if (Math.abs(n) >= 1e12) return n.toExponential(6);
  const s = String(n);
  if (s.length > 14) return Number(n.toPrecision(12)).toString();
  return s;
}

function compute(a: number, b: number, op: string): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

const FN = "#5C5C5E";
const NUM = "#3A3A3C";
const OP = "#F59E0B";

function Key({
  label,
  bg,
  onPress,
  wide,
}: {
  label: string;
  bg: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: bg },
        wide && styles.keyWide,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

export default function CalculatorScreen() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  const read = useCallback(() => {
    const v = parseFloat(display);
    return Number.isFinite(v) ? v : 0;
  }, [display]);

  const clearAll = () => {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setFresh(false);
  };

  const inputDigit = (d: string) => {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
      return;
    }
    if (d === "." && display.includes(".")) return;
    if (display === "Error") {
      setDisplay(d === "." ? "0." : d);
      return;
    }
    setDisplay((cur) => (cur === "0" && d !== "." ? d : cur + d));
  };

  const backspace = () => {
    setDisplay((cur) => (cur.length <= 1 ? "0" : cur.slice(0, -1)));
    setFresh(false);
  };

  const negate = () => {
    if (display === "Error") return;
    setDisplay(formatDisplay(-read()));
    setFresh(false);
  };

  const pickOp = (next: string) => {
    if (display === "Error") return;
    const cur = read();
    if (stored !== null && pendingOp && !fresh) {
      const res = compute(stored, cur, pendingOp);
      if (!Number.isFinite(res)) {
        setDisplay("Error");
        setStored(null);
        setPendingOp(null);
        setFresh(false);
        return;
      }
      setStored(res);
      setDisplay(formatDisplay(res));
    } else {
      setStored(cur);
    }
    setPendingOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (display === "Error" || stored === null || !pendingOp || fresh) return;
    const res = compute(stored, read(), pendingOp);
    setDisplay(Number.isFinite(res) ? formatDisplay(res) : "Error");
    setStored(null);
    setPendingOp(null);
    setFresh(true);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/calculators");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Pressable
        onPress={goBack}
        hitSlop={8}
        style={styles.backRow}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <View style={styles.backCircle}>
          <Text style={styles.backArrow}>←</Text>
        </View>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.wrap}>
        <Text style={styles.heading}>Calculator</Text>
        <Text style={styles.sub}>Quick sums — not tax or SIP tools</Text>

        <View style={styles.panel}>
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </Text>
          {stored !== null && pendingOp ? (
            <Text style={styles.pending}>
              {formatDisplay(stored)} {pendingOp}
            </Text>
          ) : null}

          <View style={styles.grid}>
            <Key label="AC" bg={FN} onPress={clearAll} />
            <Key label="+/−" bg={FN} onPress={negate} />
            <Key label="⌫" bg={FN} onPress={backspace} />
            <Key label="÷" bg={OP} onPress={() => pickOp("÷")} />
            {["7", "8", "9"].map((d) => (
              <Key key={d} label={d} bg={NUM} onPress={() => inputDigit(d)} />
            ))}
            <Key label="×" bg={OP} onPress={() => pickOp("×")} />
            {["4", "5", "6"].map((d) => (
              <Key key={d} label={d} bg={NUM} onPress={() => inputDigit(d)} />
            ))}
            <Key label="−" bg={OP} onPress={() => pickOp("−")} />
            {["1", "2", "3"].map((d) => (
              <Key key={d} label={d} bg={NUM} onPress={() => inputDigit(d)} />
            ))}
            <Key label="+" bg={OP} onPress={() => pickOp("+")} />
            <Key label="0" bg={NUM} wide onPress={() => inputDigit("0")} />
            <Key label="." bg={NUM} onPress={() => inputDigit(".")} />
            <Key label="=" bg={OP} onPress={equals} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  backCircle: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 16, fontWeight: "700", color: Colors.primaryText },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  wrap: {
    flex: 1,
    width: "100%",
    maxWidth: 512,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    justifyContent: "flex-start",
  },
  heading: {
    marginBottom: 4,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  sub: {
    marginBottom: 16,
    textAlign: "center",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  panel: {
    marginTop: "auto",
    marginBottom: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    backgroundColor: "#111110",
    padding: 12,
  },
  display: {
    minHeight: 64,
    marginBottom: 12,
    textAlign: "right",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 40,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  pending: {
    marginBottom: 8,
    textAlign: "right",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  key: {
    width: "22%",
    flexGrow: 1,
    minHeight: 68,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keyWide: { width: "46%", flexGrow: 2 },
  keyText: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
}));
