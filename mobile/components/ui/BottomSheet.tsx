import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";

/** Slide-up sheet (20px top radius, tap backdrop to close) — matches AddExpenseSheet chrome. */
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

const styles = StyleSheet.create({
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
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
  },
  body: { paddingHorizontal: 20, paddingTop: 16 },
});
