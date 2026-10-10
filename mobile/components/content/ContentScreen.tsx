import { forwardRef, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, themedStyles } from "@/constants/theme";
import { goBackOr, PUBLIC_SITE_URL } from "@/lib/contentLinks";

export async function shareFinkoinPage(title: string, path: string) {
  const url = `${PUBLIC_SITE_URL}${path}`;
  try {
    await Share.share({ title, message: `${title}\n${url}`, url });
  } catch {
    // User dismissed or share unavailable.
  }
}

type Props = {
  /** Small title shown in the top bar. */
  barTitle?: string;
  /** When set, shows a Share button that shares the public finkoin.com URL. */
  share?: { title: string; path: string };
  backFallback?: string;
  children: ReactNode;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentPadding?: number;
};

/** Native page shell: safe area, back + share bar, scrolling content. */
export const ContentScreen = forwardRef<ScrollView, Props>(
  function ContentScreen(
    {
      barTitle,
      share,
      backFallback = "/(tabs)",
      children,
      onScroll,
      contentPadding = 20,
    },
    ref,
  ) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.bar}>
          <Pressable
            onPress={() => goBackOr(backFallback)}
            style={styles.back}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.barTitle} numberOfLines={1}>
            {barTitle ?? ""}
          </Text>
          {share ? (
            <Pressable
              onPress={() => void shareFinkoinPage(share.title, share.path)}
              style={styles.share}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Text style={styles.shareText}>Share</Text>
            </Pressable>
          ) : (
            <View style={styles.barSpacer} />
          )}
        </View>
        <ScrollView
          ref={ref}
          contentContainerStyle={[styles.content, { padding: contentPadding }]}
          onScroll={onScroll}
          scrollEventThrottle={64}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  },
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  back: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  barTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  share: {
    minHeight: 44,
    minWidth: 72,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  shareText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  barSpacer: { minWidth: 72 },
  content: { paddingBottom: 120 },
}));
