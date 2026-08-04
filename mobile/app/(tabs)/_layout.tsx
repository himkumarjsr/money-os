import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

function TabIcon({
  focused,
  emoji,
  label,
}: {
  focused: boolean;
  emoji: string;
  label: string;
}) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E6F0",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🏠" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="analyse"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="📊" label="Health" />
          ),
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🧮" label="Tools" />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="📒" label="Track" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: "center", gap: 2 },
  tabEmoji: { fontSize: 22 },
  tabLabel: {
    fontSize: 10,
    color: "#9B9A94",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#534AB7",
    fontWeight: "700",
  },
});
