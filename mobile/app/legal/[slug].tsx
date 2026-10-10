/**
 * Native Legal pages — port of web app/legal/{privacy,terms,refund,disclaimer,delete-account}.
 * Content lives in constants/legal/*.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { ContentBlocks, tones } from "@/components/content/ContentBlocks";
import { InlineText } from "@/components/content/InlineText";
import { DeleteAccountSheet } from "@/components/settings/DeleteAccountSheet";
import {
  DELETE_ACCOUNT_WIDGET,
  getLegalDoc,
  type LegalDoc,
} from "@/constants/legal";
import { useAuthStore } from "@/store/authStore";

function DeleteAccountAction() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>Delete it right here</Text>
      <Text style={styles.actionText}>
        {isLoggedIn
          ? "You're signed in on this device. You'll be asked to type DELETE to confirm."
          : "Log in to the account you want to delete, then come back to this page."}
      </Text>
      {isLoggedIn ? (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.dangerBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.dangerBtnText}>Delete account permanently</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.loginBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.loginBtnText}>Log in</Text>
        </Pressable>
      )}
      <DeleteAccountSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function renderWidget(name: string) {
  if (name === DELETE_ACCOUNT_WIDGET) return <DeleteAccountAction />;
  return null;
}

function LegalBody({ doc }: { doc: LegalDoc }) {
  const summaryTone = doc.summary ? tones()[doc.summary.tone] : null;
  const headingStyle =
    doc.headingStyle === "underlined"
      ? styles.h2Underlined
      : doc.headingStyle === "small"
        ? styles.h2Small
        : styles.h2Plain;

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{doc.eyebrow}</Text>
        <Text style={styles.h1}>{doc.title}</Text>
        <Text style={styles.meta}>{doc.meta}</Text>
      </View>

      {doc.summary && summaryTone ? (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: summaryTone.bg,
              borderColor: summaryTone.border,
            },
          ]}
        >
          <InlineText
            text={doc.summary.text}
            style={[styles.summaryText, { color: summaryTone.fg }]}
          />
        </View>
      ) : null}

      {doc.sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={headingStyle}>{s.title}</Text>
          <ContentBlocks
            blocks={s.blocks}
            base={{ fontSize: 15, lineHeight: 26 }}
            renderWidget={renderWidget}
          />
        </View>
      ))}

      {doc.note ? <InlineText text={doc.note} style={styles.note} /> : null}

      {doc.footer ? (
        <View style={styles.footer}>
          {doc.footer.map((f, i) => (
            <InlineText key={i} text={f} style={styles.footerText} />
          ))}
        </View>
      ) : null}
    </>
  );
}

export default function LegalScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof rawSlug === "string" ? rawSlug : "";
  const doc = getLegalDoc(slug);

  return (
    <ContentScreen
      barTitle={doc?.title ?? "Legal"}
      share={
        doc
          ? { title: `${doc.title} | Finkoin`, path: `/legal/${doc.slug}` }
          : undefined
      }
    >
      {doc ? (
        <LegalBody doc={doc} />
      ) : (
        <View style={styles.missing}>
          <Text style={styles.h1}>Page not found</Text>
          <Text style={styles.meta}>This legal page doesn't exist.</Text>
          <Pressable
            onPress={() => router.replace("/legal/privacy" as Href)}
            style={styles.loginBtn}
            accessibilityRole="button"
          >
            <Text style={styles.loginBtnText}>Open Privacy Policy</Text>
          </Pressable>
        </View>
      )}
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 20,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 34,
  },
  meta: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  summary: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 28,
  },
  summaryText: { fontSize: 15, lineHeight: 25 },
  section: { marginBottom: 32 },
  h2Underlined: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    lineHeight: 26,
  },
  h2Plain: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 26,
  },
  h2Small: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
    lineHeight: 24,
  },
  note: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 20,
    marginTop: 12,
    gap: 14,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  actionTitle: { fontSize: 15, fontWeight: "800", color: Colors.textPrimary },
  actionText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  dangerBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dangerBtnText: { color: Colors.onPrimary, fontWeight: "700", fontSize: 14 },
  loginBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  loginBtnText: { color: Colors.onPrimary, fontWeight: "700", fontSize: 14 },
  missing: { paddingTop: 24, gap: 8 },
}));
