import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";
import { ContentScreen } from "./ContentScreen";

/** Shared layout for the PWA "Coming soon" pages (careers, press). */
export function ComingSoon({
  eyebrow,
  body,
  primary,
  secondary,
}: {
  eyebrow: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <ContentScreen barTitle={eyebrow}>
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        <Text style={styles.h1}>Coming soon</Text>
        <Text style={styles.body}>{body}</Text>
        <Pressable
          onPress={() => openContentHref(primary.href)}
          style={styles.primary}
          accessibilityRole="link"
        >
          <Text style={styles.primaryText}>{primary.label}</Text>
        </Pressable>
        {secondary ? (
          <Pressable
            onPress={() => openContentHref(secondary.href)}
            style={styles.secondary}
            accessibilityRole="link"
          >
            <Text style={styles.secondaryText}>{secondary.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </ContentScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 72 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    color: Colors.indigo600,
  },
  h1: { marginTop: 12, fontSize: 30, fontWeight: "800", color: Colors.textPrimary },
  body: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
    textAlign: "center",
  },
  primary: { marginTop: 28, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#4338CA" },
  secondary: { marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  secondaryText: { fontSize: 14, color: "#64748B" },
});
