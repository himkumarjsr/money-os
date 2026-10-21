import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, getActiveTheme, themedStyles } from "@/constants/theme";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";

/** Slide-up sheet (20px top radius, tap backdrop to close) - matches AddExpenseSheet chrome. */
export function BottomSheet({
  visible,
  onClose,
  children,
  scroll = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, scrollRef, onScroll, onFocusWithin } =
    useKeyboardSheet();
  const padBottom = keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16) + 16;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <Pressable
          style={styles.backdropTap}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            { maxHeight: (windowHeight - keyboardHeight - insets.top) * 0.94 },
          ]}
        >
          <View style={styles.handle} />
          {scroll ? (
            <ScrollView
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.body,
                { paddingBottom: padBottom },
              ]}
            >
              <View onFocus={onFocusWithin}>{children}</View>
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingBottom: padBottom }]}>
              {children}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Web: shadow-[0_-4px_40px_rgba(0,0,0,0.12)]
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    // Web: h-1 w-9 rounded-full bg-[#E0DFF8]
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: getActiveTheme() === "light" ? "#E0DFF8" : Colors.border,
    marginTop: 8,
  },
  body: { paddingHorizontal: 20, paddingTop: 16 },
}));
