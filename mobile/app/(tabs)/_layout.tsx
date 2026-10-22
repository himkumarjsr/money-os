import { Tabs } from "expo-router";

/**
 * The dock itself is rendered by GlobalChrome (root layout) so it shows on
 * every screen, not only these tabs; the navigator draws no tab bar.
 * Dock tabs match the PWA's mobile bottom nav exactly:
 * Home · Report · Track · Calculators · Profile.
 * Split remains in the stack (reachable from Home's quick tools) but
 * hidden from the dock, same as on web.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="analyse" options={{ title: "Report" }} />
      <Tabs.Screen name="tracker" options={{ title: "Track" }} />
      <Tabs.Screen name="calculators" options={{ title: "Calculators" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="split" options={{ title: "Settle Up", href: null }} />
    </Tabs>
  );
}
