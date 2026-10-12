/**
 * Compare insurance plans — port of web app/insurance/page.tsx. The policy
 * vault stores a prefill for the comparison hub; here it's read from the
 * same `finkoin_compare_prefill` key (syncKv stands in for sessionStorage).
 */
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { PageScaffold } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";

type ComparePrefill = {
  insurerName?: string;
  policyType?: string;
  coverAmount?: number;
  premiumAmount?: number;
  premiumFrequency?: string;
  planName?: string | null;
};

export default function InsuranceCompareScreen() {
  const [prefill, setPrefill] = useState<ComparePrefill | null>(null);

  useEffect(() => {
    void hydrateSyncKv().then(() => {
      try {
        const raw = syncKv.getItem("finkoin_compare_prefill");
        if (raw) setPrefill(JSON.parse(raw) as ComparePrefill);
      } catch {
        setPrefill(null);
      }
    });
  }, []);

  return (
    <PageScaffold
      title="Compare insurance plans"
      subtitle="This hub will match you to plans using your profile. Below is a snapshot from your vault request."
      backLabel="← Back to policy vault"
      backTo={"/policies" as Href}
    >
      <View style={{ gap: 24 }}>
        {prefill ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pre-filled from your policy</Text>
            <View style={{ marginTop: 12, gap: 4 }}>
              <Row label="Insurer:" value={prefill.insurerName ?? "—"} />
              <Row
                label="Type:"
                value={prefill.policyType?.replace(/_/g, " ") ?? "—"}
              />
              {prefill.planName ? (
                <Row label="Plan:" value={prefill.planName} />
              ) : null}
              <Row
                label="Cover (₹):"
                value={
                  prefill.coverAmount != null
                    ? prefill.coverAmount.toLocaleString("en-IN")
                    : "—"
                }
              />
              <Row
                label="Premium:"
                value={
                  prefill.premiumAmount != null
                    ? `₹${prefill.premiumAmount.toLocaleString("en-IN")} / ${prefill.premiumFrequency ?? "month"}`
                    : "—"
                }
              />
            </View>
          </View>
        ) : null}

        <View style={styles.dashed}>
          <Text style={styles.dashedText}>
            Full comparison engine and insurer APIs are coming next. For now,
            use your insurer renewal link from the vault or speak with a
            Finkoin advisor.
          </Text>
          <Pressable
            onPress={() => router.push("/policies" as Href)}
            style={styles.primaryBtn}
            accessibilityRole="link"
          >
            <Text style={styles.primaryBtnText}>Return to policies</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/analyse")}
            style={styles.secondaryBtn}
            accessibilityRole="link"
          >
            <Text style={styles.secondaryBtnText}>Update financial profile</Text>
          </Pressable>
        </View>
      </View>
    </PageScaffold>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text> {value}
    </Text>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  row: { fontSize: 14, color: Colors.textPrimary },
  rowLabel: { color: Colors.textSecondary },
  dashed: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.primaryTintBorder,
    backgroundColor: Colors.primaryTint,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  dashedText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  primaryBtn: {
    alignSelf: "stretch",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    alignSelf: "stretch",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: "600" },
}));
