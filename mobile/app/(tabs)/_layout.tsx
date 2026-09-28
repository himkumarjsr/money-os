import { Tabs } from "expo-router";
import { FinkoinTabBar } from "@/components/navigation/FinkoinTabBar";

/**
 * Phase 1 tabs: Home · Report · Track · Split · Profile
 * Calculators remains in stack but hidden from dock.
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
      <Tabs.Screen name="split" options={{ title: "Split" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen
        name="calculators"
        options={{ title: "Calculators", href: null }}
      />
    </Tabs>
  );
}
