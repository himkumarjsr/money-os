/**
 * My Goals — port of web app/goals/page.tsx.
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";

const THEME = "#534AB7";

const GOALS: Array<{
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
}> = [
  {
    id: "emergency",
    icon: <AppIcon name="shield" size={32} color={THEME} />,
    title: "Emergency Fund",
    description: "6–9 months of expenses saved",
  },
  {
    id: "home",
    icon: <AppIcon name="home" size={32} color={THEME} />,
    title: "Buy a Home",
    description: "Save for down payment",
  },
  {
    id: "retirement",
    icon: <AppIcon name="sunrise" size={32} color={THEME} />,
    title: "Retirement Corpus",
    description: "25× annual expenses by retirement",
  },
  {
    id: "education",
    icon: <TrackerIcon name="graduation" size={32} color={THEME} />,
    title: "Child Education",
    description: "Fund for children's education",
  },
  {
    id: "vehicle",
    icon: <TrackerIcon name="car" size={32} color={THEME} />,
    title: "Buy a Vehicle",
    description: "Save for car or bike",
  },
  {
    id: "travel",
    icon: <TrackerIcon name="plane" size={32} color={THEME} />,
    title: "Dream Vacation",
    description: "Save for travel goals",
  },
];

export default function GoalsScreen() {
  return (
    <PageScaffold
      title="My Goals"
      subtitle="Goal-based planning ties every rupee to a milestone. We're rolling out trackers per goal soon."
      requireAuth
    >
      <Pressable
        onPress={() => router.push("/(tabs)/analyse")}
        style={[pageStyles.primaryBtn, { marginBottom: 20 }]}
        accessibilityRole="button"
      >
        <Text style={pageStyles.primaryBtnText}>
          Complete your analysis →
        </Text>
      </Pressable>

      <View style={{ gap: 12 }}>
        {GOALS.map((g) => (
          <View key={g.id} style={pageStyles.card}>
            <View style={styles.soon}>
              <Text style={styles.soonText}>COMING SOON</Text>
            </View>
            {g.icon}
            <Text style={styles.title}>{g.title}</Text>
            <Text style={styles.desc}>{g.description}</Text>
          </View>
        ))}
      </View>

      <Text style={pageStyles.footnote}>
        Educational guidance only.{" "}
        <Text
          style={pageStyles.link}
          onPress={() => router.push("/legal/disclaimer" as never)}
        >
          Disclaimer
        </Text>
      </Text>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  soon: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "#F7F7F4",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9B9A94",
    letterSpacing: 0.5,
  },
  title: { marginTop: 12, fontSize: 17, fontWeight: "700", color: "#111110" },
  desc: { marginTop: 6, fontSize: 14, color: "#5F5E5A", lineHeight: 20 },
});
