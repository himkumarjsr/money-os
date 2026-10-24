/**
 * Link your partner - port of web app/household (HouseholdClient.tsx).
 * Two accounts, one household: a combined report and the partner's spends,
 * each partner choosing what to share.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { YearlyRoadmapTable } from "@/components/analyse/fixplan/YearlyRoadmapTable";
import { PageScaffold } from "@/components/ui/PageScaffold";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
  themedStyles,
} from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import {
  acceptHouseholdInvite,
  createHouseholdInvite,
  householdInviteUrl,
  householdStatus,
  monthRange,
  partnerProfile,
  partnerTransactions,
  setHouseholdShare,
  spendByBucket,
  unlinkHousehold,
  type HouseholdShare,
  type HouseholdStatus,
  type PartnerTransaction,
} from "@/lib/householdClient";
import {
  combineHouseholdProfiles,
  HOUSEHOLD_RULES_LINE,
} from "@/lib/householdProfile";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { supabase } from "@/lib/supabase";
import { useFinancialStore } from "@/store/financialStore";

const SITE = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com"
).replace(/\/$/, "");

const money = (v: number) =>
  `${v < 0 ? "−" : ""}₹${formatIndian(Math.round(Math.abs(v)))}`;

const SHARE_ROWS: Array<[keyof HouseholdShare, string, string]> = [
  [
    "profile",
    "My money profile",
    "Income, spends, savings, loans and cover from your report, for a combined household report.",
  ],
  [
    "tracker",
    "My tracker spends",
    "Every expense you add in the tracker, read-only.",
  ],
];

export default function HouseholdScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const mine = useFinancialStore((s) => s.lastSubmission);
  const [status, setStatus] = useState<HouseholdStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(
    typeof params.code === "string" ? params.code : "",
  );
  const [copied, setCopied] = useState(false);
  const [partner, setPartner] = useState<FinancialProfile | null>(null);
  const [spends, setSpends] = useState<PartnerTransaction[] | null>(null);

  const run = useCallback(async (fn: () => Promise<HouseholdStatus | void>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setStatus(next ?? (await householdStatus(supabase)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(() => householdStatus(supabase));
  }, [run]);

  const active = status?.status === "active";
  const partnerShares = status?.partner_share;
  useEffect(() => {
    if (!active) {
      setPartner(null);
      setSpends(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { from, to } = monthRange();
        const [p, t] = await Promise.all([
          partnerShares?.profile ? partnerProfile(supabase) : null,
          partnerShares?.tracker
            ? partnerTransactions(supabase, from, to)
            : null,
        ]);
        if (!cancelled) {
          setPartner(p);
          setSpends(t);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, partnerShares?.profile, partnerShares?.tracker]);

  const inviteUrl = status?.invite_code
    ? householdInviteUrl(status.invite_code, SITE)
    : "";
  const share = status?.my_share ?? { profile: false, tracker: false };
  const partnerName = status?.partner_name || "your partner";

  return (
    <PageScaffold
      title="Link your partner"
      subtitle="Two accounts, one household. Each of you chooses what to share, and either of you can unlink at any time."
      requireAuth
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {status === null ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : status.status === "none" ? (
        <>
          <View style={styles.card}>
            <Text style={styles.h2}>Invite your partner</Text>
            <Text style={styles.muted}>
              Get a code and send it to them. They open the link or type the
              code in their own Finkoin account.
            </Text>
            <Pressable
              style={[styles.primaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await createHouseholdInvite(supabase);
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Get an invite code</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            <Text style={styles.h2}>Got a code?</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="8-letter code"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Invite code"
              style={styles.input}
            />
            <Pressable
              style={[
                styles.primaryBtn,
                (busy || code.trim().length < 8) && styles.disabled,
              ]}
              disabled={busy || code.trim().length < 8}
              onPress={() =>
                void run(() => acceptHouseholdInvite(supabase, code))
              }
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Link accounts</Text>
            </Pressable>
          </View>
        </>
      ) : status.status === "pending" ? (
        <View style={styles.card}>
          <Text style={styles.h2}>Waiting for your partner</Text>
          <Text style={styles.muted}>
            Send them this code or link. It works once.
          </Text>
          <Text style={styles.code} selectable>
            {status.invite_code}
          </Text>
          <Text style={styles.link} selectable>
            {inviteUrl}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={styles.quietBtn}
              onPress={async () => {
                await Clipboard.setStringAsync(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
            >
              <Text style={styles.quietText}>
                {copied ? "Copied" : "Copy link"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.waBtn}
              onPress={() =>
                void Share.share({
                  message: `Let's link our Finkoin accounts so we can plan our money together. Open ${inviteUrl} or enter code ${status.invite_code}.`,
                })
              }
            >
              <Text style={styles.waText}>Share</Text>
            </Pressable>
            <Pressable
              style={styles.quietBtn}
              disabled={busy}
              onPress={() => void run(() => unlinkHousehold(supabase))}
            >
              <Text style={styles.quietText}>Cancel invite</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.h2}>Linked with {partnerName}</Text>
            <Text style={styles.muted}>What you share with them:</Text>
            {SHARE_ROWS.map(([key, label, hint]) => (
              <View key={key} style={styles.shareRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareLabel}>{label}</Text>
                  <Text style={styles.small}>{hint}</Text>
                </View>
                <Switch
                  value={share[key]}
                  disabled={busy}
                  onValueChange={(v) =>
                    void run(() =>
                      setHouseholdShare(supabase, { ...share, [key]: v }),
                    )
                  }
                  accessibilityLabel={label}
                />
              </View>
            ))}
            <Text style={styles.small}>
              {partnerName} shares:{" "}
              {[
                partnerShares?.profile ? "money profile" : null,
                partnerShares?.tracker ? "tracker spends" : null,
              ]
                .filter(Boolean)
                .join(" and ") || "nothing yet"}
              .
            </Text>
            <Pressable
              style={styles.quietBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Unlink?",
                  "You both stop seeing each other's data straight away.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Unlink",
                      style: "destructive",
                      onPress: () => void run(() => unlinkHousehold(supabase)),
                    },
                  ],
                )
              }
            >
              <Text style={[styles.quietText, { color: Colors.errorText }]}>
                Unlink
              </Text>
            </Pressable>
          </View>

          <HouseholdReport
            mine={mine}
            partner={partner}
            partnerName={partnerName}
            partnerShares={!!partnerShares?.profile}
          />
          <PartnerSpends
            rows={spends}
            partnerName={partnerName}
            partnerShares={!!partnerShares?.tracker}
          />
        </>
      )}
    </PageScaffold>
  );
}

function HouseholdReport({
  mine,
  partner,
  partnerName,
  partnerShares,
}: {
  mine: FinancialProfile | null;
  partner: FinancialProfile | null;
  partnerName: string;
  partnerShares: boolean;
}) {
  const combined = useMemo(() => {
    if (!mine || !partner) return null;
    const profile = combineHouseholdProfiles(mine, partner);
    const result = analyseFinances(profile);
    const plan = buildPriorityPlan(profile, result);
    return { profile, result, plan };
  }, [mine, partner]);

  if (!mine)
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Household report</Text>
        <Text style={styles.muted}>
          Finish your own analysis first, then come back here.
        </Text>
        <Pressable onPress={() => router.push("/analyse" as Href)}>
          <Text style={styles.linkText}>Start analysis →</Text>
        </Pressable>
      </View>
    );
  if (!partnerShares || !combined)
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Household report</Text>
        <Text style={styles.muted}>
          {partnerShares
            ? `Loading ${partnerName}'s profile…`
            : `Shows once ${partnerName} shares their money profile.`}
        </Text>
      </View>
    );

  const { result, plan, profile } = combined;
  const facts: Array<[string, string]> = [
    ["Money score", `${result.overallScore} / 100`],
    [
      "Household income / month",
      money(
        (profile.monthlySalary || 0) +
          (profile.spouseIncome || 0) +
          (profile.otherIncome || 0),
      ),
    ],
    ["Left over / month", money(plan.monthlySurplus)],
    ["Net worth", money(result.netWorth)],
  ];
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.h2}>Household report</Text>
        <Text style={styles.small}>{HOUSEHOLD_RULES_LINE}</Text>
        <View style={styles.facts}>
          {facts.map(([label, v]) => (
            <View key={label} style={styles.fact}>
              <Text style={styles.small}>{label}</Text>
              <Text style={styles.factValue}>{v}</Text>
            </View>
          ))}
        </View>
        {(result.moneyScore?.topActions ?? []).slice(0, 3).map((a) => (
          <Text key={a.text} style={styles.bullet}>
            • {a.text}
          </Text>
        ))}
      </View>
      <YearlyRoadmapTable profile={profile} items={plan.goalFunding?.items} />
    </>
  );
}

function PartnerSpends({
  rows,
  partnerName,
  partnerShares,
}: {
  rows: PartnerTransaction[] | null;
  partnerName: string;
  partnerShares: boolean;
}) {
  const month = new Date().toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const name = partnerName.charAt(0).toUpperCase() + partnerName.slice(1);
  if (!partnerShares)
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>{name}&apos;s spends</Text>
        <Text style={styles.muted}>
          Shows once they share their tracker spends.
        </Text>
      </View>
    );
  const sum = spendByBucket(rows ?? []);
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>
        {name}&apos;s spends · {month}
      </Text>
      {rows === null ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.muted}>Nothing added this month.</Text>
      ) : (
        <>
          <Text style={styles.total}>{money(sum.total)}</Text>
          <Text style={styles.small}>
            {sum.buckets.map(([b, v]) => `${b} ${money(v)}`).join(" · ")}
          </Text>
          {rows.slice(0, 30).map((t) => (
            <View key={t.id} style={styles.spendRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareLabel} numberOfLines={1}>
                  {t.description || t.subcategory || t.category}
                </Text>
                <Text style={styles.small}>
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {t.category}
                </Text>
              </View>
              <Text style={styles.amount}>{money(t.amount)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    gap: Spacing.sm,
  },
  h2: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.textPrimary },
  muted: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  small: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  error: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorLight,
    color: Colors.errorText,
    fontSize: FontSize.sm,
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  disabled: { opacity: 0.5 },
  quietBtn: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  quietText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  waBtn: {
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  waText: { color: "#FFFFFF", fontWeight: "700", fontSize: FontSize.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  input: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  code: {
    textAlign: "center",
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    letterSpacing: 6,
    color: Colors.primaryText,
  },
  link: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  linkText: {
    color: Colors.primaryText,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  shareLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: Spacing.md },
  fact: { width: "50%", paddingRight: Spacing.sm },
  factValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bullet: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  total: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  spendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
  },
  amount: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
}));
