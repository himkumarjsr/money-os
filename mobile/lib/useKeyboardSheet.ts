import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

const REVEAL_MARGIN = 24;

/**
 * Keyboard handling for slide-up sheets rendered in a `Modal`.
 * Android is edge-to-edge (window never resizes) and KeyboardAvoidingView has no
 * reliable Android behavior inside a Modal, so lift the sheet by the keyboard
 * height ourselves and scroll the focused input above the keyboard.
 * Modal must use `statusBarTranslucent` so window and screen coordinates align.
 */
export function useKeyboardSheet() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const revealFocusedInput = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput();
    if (top == null || !input || !scrollRef.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overflow = y + h - (top - REVEAL_MARGIN);
      if (overflow > 0) {
        scrollRef.current?.scrollTo({
          y: scrollY.current + overflow,
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const onShow = (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      // Wait for the sheet to re-layout with the new bottom padding.
      setTimeout(revealFocusedInput, ios ? 280 : 120);
    };
    const onHide = () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    };
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      onShow,
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      onHide,
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [revealFocusedInput]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  /** Attach to a wrapper View's (bubbling) `onFocus`: re-check when focus moves while the keyboard stays open. */
  const onFocusWithin = useCallback(() => {
    if (keyboardTop.current != null) setTimeout(revealFocusedInput, 50);
  }, [revealFocusedInput]);

  return { keyboardHeight, scrollRef, onScroll, onFocusWithin };
}
