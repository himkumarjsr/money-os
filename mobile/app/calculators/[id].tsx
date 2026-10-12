import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, themedStyles } from "@/constants/theme";
import { ShareButton } from "@/components/ui/ShareButton";
import {
  CalculatorRelatedLinks,
  TaxExploreMore,
} from "@/components/calculators/CalculatorRelatedLinks";
import { CATEGORIES, type CalcItem } from "@/constants/calculator-config";
import { calculatorsById } from "@/components/calculators/registry";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";
import { siteBase } from "@/lib/splitApi";

function findItem(id: string): CalcItem | null {
  for (const c of CATEGORIES) {
    const item = c.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

function sharePath(id: string) {
  return id === "tax-regime"
    ? "/calculators/tax-regime-2026"
    : `/calculators/${id}`;
}

export default function CalculatorScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = typeof rawId === "string" ? rawId : "";
  const item = useMemo(() => findItem(id), [id]);
  const Calc = calculatorsById[id];
  const { keyboardHeight, scrollRef, onScroll, onFocusWithin } =
    useKeyboardSheet();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/calculators");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
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
        <Text style={styles.topTitle} numberOfLines={1}>
          {item?.title ?? "Calculator"}
        </Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.pad,
          { paddingBottom: 40 + keyboardHeight },
        ]}
      >
        <View style={styles.card} onFocus={onFocusWithin}>
          <View style={styles.headRow}>
            <Text style={styles.blurb}>{item?.blurb ?? ""}</Text>
            {item ? (
              <ShareButton
                title={`${item.title} | Finkoin`}
                url={`${siteBase()}${sharePath(id)}`}
              />
            ) : null}
          </View>
          <View style={{ marginTop: 20 }}>
            {Calc ? (
              <Calc />
            ) : (
              <Text style={styles.fallback}>
                This calculator isn&apos;t available yet.
              </Text>
            )}
          </View>
        </View>
        <CalculatorRelatedLinks calcId={id} />
        {id === "tax-regime" ? <TaxExploreMore /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.card },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    width: 72,
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
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  pad: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fallback: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  blurb: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
}));
