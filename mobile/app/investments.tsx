/**
 * My Investments — port of web app/investments/page.tsx.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { formatIndian } from "@/lib/formatters";
import { useFinancialStore } from "@/store/financialStore";

function n(v: number | undefined | null) {
  return Math.max(0, Number(v ?? 0));
}

export default function InvestmentsScreen() {
  const submission = useFinancialStore((s) => s.lastSubmission);

  const mf = n(submission?.mfValue);
  const fd = n(submission?.fdValue);
  const ppf = n(submission?.ppfBalance);
  const nps = n(submission?.npsBalance);
  const epf = n(submission?.epfBalance);
  const stocksIn = n(submission?.indianStocksValue);
  const stocksUs = n(submission?.usStocksValueINR);
  const usMf = n(submission?.usMFValueINR);
  const equity =
    n(submission?.totalEquityValue) > 0
      ? n(submission?.totalEquityValue)
      : stocksIn + stocksUs + usMf;
  const total = mf + fd + ppf + nps + epf + equity;

  return (
    <PageScaffold
      title="My Investments"
      subtitle="Snapshot from your last financial analysis submission."
      requireAuth
    >
      {!submission ? (
        <View style={[pageStyles.card, styles.empty]}>
          <AppIcon name="trending" size={40} color="#534AB7" />
          <Text style={styles.emptyTitle}>No analysis yet</Text>
          <Text style={styles.emptySub}>
            Complete your financial analysis to see your mutual funds, FDs, PPF,
            equity and other holdings here.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/analyse")}
            style={[pageStyles.primaryBtn, { marginTop: 20 }]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>Start analysis →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[pageStyles.card, { gap: 12 }]}>
            <Row label="Mutual funds" value={mf} />
            <Row label="Fixed deposits" value={fd} />
            <Row label="PPF" value={ppf} />
            <Row label="NPS" value={nps} />
            <Row label="EPF / PF corpus" value={epf} />
            <Row label="Equity (stocks / RSU / blended)" value={equity} />
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Estimated investment total</Text>
              <Text style={styles.totalText}>₹{formatIndian(total)}</Text>
            </View>
          </View>

          <View style={styles.soonCard}>
            <Text style={styles.soonTitle}>Portfolio analysis</Text>
            <Text style={styles.soonSub}>
              Deeper allocation insights and benchmarks are coming soon.
            </Text>
            <View style={styles.soonBtn}>
              <Text style={pageStyles.primaryBtnText}>Notify me when live</Text>
            </View>
          </View>
        </>
      )}

      <Text style={pageStyles.footnote}>
        Illustrative totals from your inputs — not live broker sync.
      </Text>
    </PageScaffold>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>₹{formatIndian(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#111110",
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: "#9B9A94",
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 14, color: "#5F5E5A" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#111110" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0EFF8",
    paddingTop: 14,
    gap: 12,
  },
  totalText: { fontSize: 15, fontWeight: "700", color: "#111110" },
  soonCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEDFE",
    backgroundColor: "rgba(238,237,254,0.4)",
    padding: 20,
    alignItems: "center",
  },
  soonTitle: { fontSize: 14, fontWeight: "700", color: "#3C3489" },
  soonSub: {
    marginTop: 8,
    fontSize: 14,
    color: "#5F5E5A",
    textAlign: "center",
  },
  soonBtn: {
    marginTop: 16,
    backgroundColor: "rgba(83,74,183,0.4)",
    borderRadius: 12,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: "center",
  },
});
