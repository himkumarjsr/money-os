/**
 * App shell, the native counterpart of web `<GlobalNavbar />` + the banner
 * under it (app/layout.tsx). The web renders the header and the mobile bottom
 * dock on every route; this does the same for every screen except auth and
 * the analyse form / consent flow (web hides the navbar in the analyse modal).
 *
 * Layout: header, renewal banner, then the screens (the Stack), with the dock
 * floating over the bottom. Screens render below the header, so their own
 * `SafeAreaView edges={["top"]}` resolves to no extra top padding.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Platform, View } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { ChromeContext } from "@/components/shell/ChromeContext";
import { RenewalReminderBanner } from "@/components/shell/RenewalReminderBanner";
import { FinkoinDock, type DockId } from "@/components/navigation/FinkoinTabBar";
import { Colors } from "@/constants/theme";
import { useChromeStore } from "@/store/chromeStore";

const TAB_PATHS = new Set([
  "/",
  "/analyse",
  "/tracker",
  "/calculators",
  "/profile",
  "/split",
]);

const TAB_HREF: Record<DockId, Href> = {
  index: "/(tabs)",
  analyse: "/(tabs)/analyse",
  tracker: "/(tabs)/tracker",
  calculators: "/(tabs)/calculators",
  profile: "/(tabs)/profile",
};

/** Mirrors web `matchBottomNav` in components/global-navbar.tsx. */
function matchDock(path: string): DockId | null {
  if (path === "/" || path === "") return "index";
  if (path === "/analyse" || path.startsWith("/analyse/")) return "analyse";
  if (path === "/tracker" || path.startsWith("/tracker/")) return "tracker";
  if (path === "/calculators" || path.startsWith("/calculators/"))
    return "calculators";
  if (path === "/profile" || path.startsWith("/profile/")) return "profile";
  return null;
}

function chromeHidden(path: string): boolean {
  return (
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path.startsWith("/auth") ||
    path === "/analyse/form" ||
    path === "/analyse/consent"
  );
}

/** Space the dock takes at the bottom of non-tab screens (tab screens pad themselves). */
export const DOCK_CLEARANCE = 84;

export function GlobalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const insets = useSafeAreaInsets();
  const compact = useChromeStore((s) => s.dockCompact);
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardUp(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardUp(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // A new screen starts at the top, so the dock is full size again.
  useEffect(() => {
    useChromeStore.getState().setDockCompact(false);
  }, [pathname]);

  const hidden = chromeHidden(pathname);
  const onTab = TAB_PATHS.has(pathname);
  const active = matchDock(pathname);

  const select = (id: DockId) => {
    // Track is a plain link to the tracker (no `add` param), like web.
    router.navigate(TAB_HREF[id]);
  };

  // Keep the same element tree whether or not the chrome is hidden, or the
  // navigator (children) would remount and lose its state.
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {hidden ? null : <AppHeader root />}
      {hidden ? null : <RenewalReminderBanner />}
      <ChromeContext.Provider value={!hidden}>
        <View
          style={{
            flex: 1,
            paddingBottom:
              hidden || onTab
                ? 0
                : DOCK_CLEARANCE + Math.max(insets.bottom, 10) - 10,
          }}
        >
          {children}
        </View>
      </ChromeContext.Provider>
      {hidden || keyboardUp ? null : (
        <FinkoinDock active={active} compact={compact} onSelect={select} />
      )}
    </View>
  );
}
