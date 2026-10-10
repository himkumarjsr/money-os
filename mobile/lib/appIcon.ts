import { Platform } from "react-native";

/** Alternate home-screen icon for Premium, declared in app.json. */
const PREMIUM_ICON = "Premium";

type AppIcons = {
  supportsAlternateIcons: boolean;
  getAppIconName: () => string | null;
  setAlternateAppIcon: (name: string | null) => Promise<string | null>;
};

function loadAppIcons(): AppIcons | null {
  if (Platform.OS === "web") return null;
  try {
    // Missing in Expo Go and in builds made before the module was added.
    return require("expo-alternate-app-icons") as AppIcons;
  } catch {
    return null;
  }
}

/**
 * Show the gold icon on the home screen while Premium is unlocked, the
 * standard one otherwise. Only touches the icon when it needs to change,
 * since iOS shows a system alert on every switch.
 */
export async function syncPremiumAppIcon(unlocked: boolean): Promise<void> {
  const icons = loadAppIcons();
  if (!icons?.supportsAlternateIcons) return;
  try {
    const want = unlocked ? PREMIUM_ICON : null;
    if (icons.getAppIconName() === want) return;
    await icons.setAlternateAppIcon(want);
  } catch {
    // Cosmetic only; the next launch tries again.
  }
}
