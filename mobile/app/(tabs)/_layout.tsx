import { Tabs } from "expo-router";
import { FinkoinTabBar } from "@/components/navigation/FinkoinTabBar";

/**
 * Dock tabs match the PWA's mobile bottom nav exactly:
 * Home · Report · Track · Calculators · Profile.
 * Split remains in the stack (reachable from Home's quick tools) but
 * hidden from the dock, same as on web.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FinkoinTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="analyse" options={{ title: "Report" }} />
      <Tabs.Screen name="tracker" options={{ title: "Track" }} />
      <Tabs.Screen name="calculators" options={{ title: "Calculators" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="split" options={{ title: "Split", href: null }} />
    </Tabs>
  );
}
