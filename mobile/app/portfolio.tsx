/**
 * MF Portfolio Analysis — port of web app/portfolio/page.tsx.
 */
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

type Fund = {
  name: string;
  invested: number;
  value: number;
  xirr: number;
  verdict: "CONTINUE" | "WATCH" | "SWITCH" | "STOP";
  reason: string;
};

type Analysis = {
  totalInvested: number;
  currentValue: number;
  xirr: number;
  funds: Fund[];
};

const FALLBACK_FUNDS: Fund[] = [
  {
    name: "HDFC Flexi Cap Fund",
    invested: 400000,
    value: 515000,
    xirr: 14.2,
    verdict: "CONTINUE",
    reason: "Strong and consistent risk-adjusted returns.",
  },
  {
    name: "Axis Bluechip Fund",
    invested: 300000,
    value: 312000,
    xirr: 6.8,
    verdict: "WATCH",
    reason: "Underperformance in recent cycles, monitor for 2 quarters.",
  },
  {
    name: "Old Midcap Opportunities",
    invested: 220000,
    value: 205000,
    xirr: 3.1,
    verdict: "SWITCH",
    reason: "High expense and weak alpha vs peers.",
  },
  {
    name: "Sectoral Infra Fund",
    invested: 150000,
    value: 128000,
    xirr: -2.2,
    verdict: "STOP",
    reason: "Concentrated thematic risk and prolonged drawdown.",
  },
  {
    name: "Nifty 50 Index Fund",
    invested: 280000,
    value: 335000,
    xirr: 11.6,
    verdict: "CONTINUE",
    reason: "Low cost core exposure is performing on mandate.",
  },
];

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function PortfolioScreen() {
  const tier = useAuthStore((s) => s.user?.subscriptionTier ?? "free");
  const [folio, setFolio] = useState("");
  const [pan, setPan] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const gain = useMemo(
    () => (analysis ? analysis.currentValue - analysis.totalInvested : 0),
    [analysis],
  );

  if (tier === "free" || tier === "pro") {
    return (
      <PageScaffold title="MF Portfolio Analysis" requireAuth>
        <View style={pageStyles.card}>
          <AppIcon name="lock" size={28} color={Colors.primary} />
          <Text style={styles.lockTitle}>MF Portfolio Analysis</Text>
          <Text style={styles.lockSub}>Available in Pro Max.</Text>
        </View>
      </PageScaffold>
    );
  }

  const analyse = () => {
    setLoading(true);
    const funds = FALLBACK_FUNDS;
    const totalInvested = funds.reduce((sum, f) => sum + f.invested, 0);
    const currentValue = funds.reduce((sum, f) => sum + f.value, 0);
    const xirr = Number(((currentValue / totalInvested - 1) * 100).toFixed(2));
    setAnalysis({ totalInvested, currentValue, xirr, funds });
    setLoading(false);
  };

  return (
    <PageScaffold title="MF Portfolio Analysis" requireAuth>
      <View style={[pageStyles.card, { gap: 12 }]}>
        <TextInput
          value={folio}
          onChangeText={setFolio}
          placeholder="CAMS Folio Number"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={pan}
          onChangeText={(v) => setPan(v.toUpperCase())}
          placeholder="PAN Number"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Pressable
          onPress={analyse}
          disabled={!folio || !pan || loading}
          style={[
            pageStyles.primaryBtn,
            (!folio || !pan || loading) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={pageStyles.primaryBtnText}>
              Analyse my portfolio →
            </Text>
          )}
        </Pressable>
      </View>

      {analysis ? (
        <View style={{ marginTop: 20, gap: 12 }}>
          <View style={pageStyles.card}>
            <Text style={styles.h2}>Portfolio summary</Text>
            <Text style={styles.line}>
              Invested: {rupees(analysis.totalInvested)}
            </Text>
            <Text style={styles.line}>
              Current value: {rupees(analysis.currentValue)}
            </Text>
            <Text style={styles.line}>XIRR: {analysis.xirr}%</Text>
            <Text style={styles.line}>Gain/Loss: {rupees(gain)}</Text>
          </View>
          {analysis.funds.map((fund) => (
            <View key={fund.name} style={pageStyles.card}>
              <View style={styles.fundHead}>
                <Text style={styles.fundName}>{fund.name}</Text>
                <View style={styles.verdict}>
                  <Text style={styles.verdictText}>{fund.verdict}</Text>
                </View>
              </View>
              <Text style={styles.reason}>{fund.reason}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </PageScaffold>
  );
}

const styles = themedStyles(() => ({
  lockTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  lockSub: { marginTop: 8, fontSize: 15, color: Colors.textSecondary },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },
  h2: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  line: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  fundHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  fundName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  verdict: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verdictText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  reason: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
}));
