/** Native Contact - port of web app/contact/page.tsx. */
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { openContentHref } from "@/lib/contentLinks";

export default function ContactScreen() {
  return (
    <ContentScreen barTitle="Contact">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>CONTACT FINKOIN</Text>
        <Text style={styles.h1}>We are here to help</Text>
        <Text style={styles.body}>
          For support, feedback, or partnership queries, reach us through the
          details below.
        </Text>

        <View style={styles.grid}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>EMAIL</Text>
            <Text
              style={styles.boxLink}
              onPress={() => openContentHref("mailto:finkoin.os@gmail.com")}
              accessibilityRole="link"
            >
              finkoin.os@gmail.com
            </Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>PHONE</Text>
            <Text
              style={styles.boxLink}
              onPress={() => openContentHref("tel:+918095373711")}
              accessibilityRole="link"
            >
              +91 8095373711
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => openContentHref("/analyse")}
            style={styles.primary}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Back to Analyse</Text>
          </Pressable>
          <Pressable
            onPress={() => openContentHref("/")}
            style={styles.secondary}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: Colors.primaryText,
  },
  h1: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  grid: { marginTop: 24, gap: 16 },
  box: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  boxLabel: { fontSize: 12, letterSpacing: 0.6, color: Colors.textMuted },
  boxLink: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  actions: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  primary: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  primaryText: { fontWeight: "600", fontSize: 15, color: Colors.onPrimary },
  secondary: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    fontWeight: "600",
    fontSize: 15,
    color: Colors.textSecondary,
  },
}));
