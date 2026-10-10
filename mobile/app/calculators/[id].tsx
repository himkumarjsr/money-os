import { useMemo } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, themedStyles } from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";
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

  const onShare = async () => {
    if (!item) return;
    const url = `${siteBase()}${sharePath(id)}`;
    try {
      await Share.share({
        title: `${item.title} | Finkoin`,
        message: `${item.title} | Finkoin\n${url}`,
      });
    } catch {
      // User dismissed or share unavailable.
    }
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.titleRow}>
                {item?.icon ? (
                  <AppIcon name={item.icon} size={20} color={Colors.primary} />
                ) : null}
                <Text style={styles.title}>{item?.title ?? "Calculator"}</Text>
              </View>
              {item?.blurb ? (
                <Text style={styles.blurb}>{item.blurb}</Text>
              ) : null}
            </View>
            {item ? (
              <Pressable
                onPress={() => void onShare()}
                style={styles.shareBtn}
                accessibilityRole="button"
                accessibilityLabel="Share calculator"
              >
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ marginTop: 20 }}>
            {Calc ? (
              <Calc />
            ) : (
              <Text style={styles.blurb}>
                This calculator isn&apos;t available yet.
              </Text>
            )}
          </View>
        </View>
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
  backArrow: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  blurb: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  shareBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
}));
