/**
 * Group detail — PWA `/split/[groupId]` parity.
 */
import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  useSplitStore,
  formatSplitRupeeExact,
  getMyBalanceFromEdges,
} from "@/store/splitStore";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import Button from "@/components/ui/Button";

type Tab = "expenses" | "members" | "settlements";

const CAT_ICON: Record<string, string> = {
  food: "🍽️",
  transport: "🚕",
  accommodation: "🏨",
  entertainment: "🎉",
  shopping: "🛍️",
  utilities: "⚡",
  medical: "💊",
  other: "🧾",
  general: "🧾",
};

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const user = useAuthStore((s) => s.user);
  const {
    activeGroup,
    expenses,
    settlements,
    balances,
    netBalances,
    loading,
    fetchGroupDetail,
    deleteGroup,
    deleteExpense,
    settleUp,
    leaveGroup,
    inviteLink,
    clearActive,
  } = useSplitStore();

  const [tab, setTab] = useState<Tab>("expenses");
  const [refreshing, setRefreshing] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [settleTo, setSettleTo] = useState("");
  const [settleAmt, setSettleAmt] = useState("");
  const [payMethod, setPayMethod] = useState<"upi" | "cash" | "bank">("upi");
  const [savingSettle, setSavingSettle] = useState(false);

  const myEmail = (user?.email ?? "").toLowerCase();

  useFocusEffect(
    useCallback(() => {
      if (groupId) void fetchGroupDetail(groupId);
      return () => {
        /* keep cache for back/forward */
      };
    }, [groupId, fetchGroupDetail]),
  );

  const members = useMemo(
    () => (activeGroup?.members ?? []).filter((m) => m.status === "active"),
    [activeGroup?.members],
  );

  const youOwe = useMemo(() => {
    return balances
      .filter((e) => e.from_email.toLowerCase() === myEmail)
      .reduce((s, e) => s + e.amount, 0);
  }, [balances, myEmail]);

  const youAreOwed = useMemo(() => {
    return balances
      .filter((e) => e.to_email.toLowerCase() === myEmail)
      .reduce((s, e) => s + e.amount, 0);
  }, [balances, myEmail]);

  const myNet = getMyBalanceFromEdges(myEmail, balances);
  const isCreator = activeGroup?.created_by === user?.id;

  const onRefresh = async () => {
    if (!groupId) return;
    setRefreshing(true);
    await fetchGroupDetail(groupId);
    setRefreshing(false);
  };

  const openInvite = async () => {
    if (!groupId) return;
    const res = await inviteLink(groupId);
    if (res.error) {
      Alert.alert("Invite", res.error);
      return;
    }
    setInviteUrl(res.inviteUrl || "");
    setShowInvite(true);
  };

  const confirmDeleteGroup = () => {
    Alert.alert(
      "Close group?",
      `Close "${activeGroup?.name}"? Only the group creator can do this.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete group",
          style: "destructive",
          onPress: async () => {
            if (!groupId) return;
            const ok = await deleteGroup(groupId);
            if (ok) {
              clearActive();
              router.replace("/(tabs)/split");
            } else Alert.alert("Error", "Could not close group");
          },
        },
      ],
    );
  };

  const recordSettlement = async () => {
    if (!user || !groupId || !settleTo || !settleAmt) {
      Alert.alert("Missing fields", "Pick who you paid and an amount");
      return;
    }
    setSavingSettle(true);
    const res = await settleUp({
      groupId,
      toEmail: settleTo,
      amount: parseFloat(settleAmt),
      userId: user.id,
      userEmail: user.email!,
      userName: user.name || undefined,
      paymentMethod: payMethod,
    });
    setSavingSettle(false);
    if (res.error) {
      Alert.alert("Error", res.error);
      return;
    }
    setShowSettle(false);
    setSettleAmt("");
    setTab("settlements");
  };

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Missing group</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Purple header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            {isCreator ? (
              <TouchableOpacity
                onPress={confirmDeleteGroup}
                style={styles.moreBtn}
              >
                <Text style={styles.moreText}>…</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
          <Text style={styles.headerEmoji}>{activeGroup?.emoji || "💰"}</Text>
          <Text style={styles.headerName}>
            {activeGroup?.name || (loading ? "Loading…" : "Group")}
          </Text>
          <Text style={styles.headerMeta}>{members.length} members · INR</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={openInvite}>
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Stat tiles */}
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>You owe</Text>
            <Text style={[styles.statVal, { color: Colors.error }]}>
              {formatSplitRupeeExact(youOwe)}
            </Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>You are owed</Text>
            <Text style={[styles.statVal, { color: Colors.success }]}>
              {formatSplitRupeeExact(youAreOwed)}
            </Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>
              {myNet > 0.5
                ? "You are owed"
                : myNet < -0.5
                  ? "You owe"
                  : "Status"}
            </Text>
            <Text
              style={[
                styles.statVal,
                {
                  color:
                    myNet > 0.5
                      ? Colors.success
                      : myNet < -0.5
                        ? Colors.error
                        : Colors.textMuted,
                },
              ]}
            >
              {Math.abs(myNet) <= 0.5
                ? "All settled"
                : formatSplitRupeeExact(Math.abs(myNet))}
            </Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => {
              const first =
                balances.find((b) => b.from_email.toLowerCase() === myEmail) ||
                balances[0];
              setSettleTo(first?.to_email || "");
              setSettleAmt(
                first && first.from_email.toLowerCase() === myEmail
                  ? String(first.amount)
                  : "",
              );
              setShowSettle(true);
            }}
          >
            <Text style={styles.ctaSecondaryText}>Settle up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => router.push(`/split/${groupId}/add-expense`)}
          >
            <Text style={styles.ctaPrimaryText}>+ Add expense</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["expenses", "members", "settlements"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "expenses" ? (
          <View style={styles.section}>
            {/* Simplified edges */}
            <Text style={styles.blockTitle}>Simplified settle-up</Text>
            {balances.length === 0 ? (
              <Text style={styles.muted}>All settled up — nothing to pay.</Text>
            ) : (
              balances.map((e, i) => {
                const iPay = e.from_email.toLowerCase() === myEmail;
                const iGet = e.to_email.toLowerCase() === myEmail;
                const from =
                  e.from_email.toLowerCase() === myEmail ? "You" : e.from_name;
                const to =
                  e.to_email.toLowerCase() === myEmail ? "You" : e.to_name;
                return (
                  <View
                    key={`${e.from_email}-${e.to_email}-${i}`}
                    style={styles.edgeRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.edgeText}>
                        {from} → {to}
                      </Text>
                      <Text style={styles.edgeAmt}>
                        {formatSplitRupeeExact(e.amount)}
                      </Text>
                    </View>
                    {iPay ? (
                      <TouchableOpacity
                        style={styles.miniSettle}
                        onPress={() => {
                          setSettleTo(e.to_email);
                          setSettleAmt(String(e.amount));
                          setShowSettle(true);
                        }}
                      >
                        <Text style={styles.miniSettleText}>Settle</Text>
                      </TouchableOpacity>
                    ) : null}
                    {iGet ? <Text style={styles.waiting}>Waiting</Text> : null}
                  </View>
                );
              })
            )}

            {netBalances.some((n) => Math.abs(n.net) > 0.5) ? (
              <>
                <Text style={[styles.blockTitle, { marginTop: 20 }]}>
                  Balances
                </Text>
                {netBalances
                  .filter((n) => Math.abs(n.net) > 0.5)
                  .map((n) => (
                    <View key={n.email} style={styles.balanceRow}>
                      <Text style={styles.balanceName}>
                        {n.email.toLowerCase() === myEmail ? "You" : n.name}
                      </Text>
                      <Text
                        style={{
                          fontWeight: "800",
                          color: n.net > 0 ? Colors.success : Colors.error,
                        }}
                      >
                        {n.net > 0
                          ? `gets back ${formatSplitRupeeExact(n.net)}`
                          : `owes ${formatSplitRupeeExact(-n.net)}`}
                      </Text>
                    </View>
                  ))}
              </>
            ) : null}

            <Text style={[styles.blockTitle, { marginTop: 20 }]}>Expenses</Text>
            {expenses.length === 0 ? (
              <Text style={styles.muted}>
                No expenses yet. Tap + Add expense.
              </Text>
            ) : (
              expenses.map((exp) => {
                const myShare =
                  exp.shares?.find((s) => s.email.toLowerCase() === myEmail)
                    ?.share_amount ?? 0;
                const canEdit =
                  exp.created_by === user?.id ||
                  exp.paid_by_email?.toLowerCase() === myEmail;
                return (
                  <TouchableOpacity
                    key={exp.id}
                    style={styles.expCard}
                    onPress={() => {
                      if (canEdit) {
                        router.push(
                          `/split/${groupId}/add-expense?edit=${exp.id}`,
                        );
                      }
                    }}
                  >
                    <Text style={styles.expIcon}>
                      {CAT_ICON[exp.category || "other"] || "🧾"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expTitle}>{exp.title}</Text>
                      <Text style={styles.expMeta}>
                        {exp.paid_by_name} · {exp.expense_date}
                        {myShare > 0
                          ? ` · you ${formatSplitRupeeExact(myShare)}`
                          : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.expAmt}>
                        {formatSplitRupeeExact(exp.amount)}
                      </Text>
                      {canEdit ? (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              "Delete expense?",
                              `Remove "${exp.title}"?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Yes, delete",
                                  style: "destructive",
                                  onPress: async () => {
                                    const r = await deleteExpense(
                                      groupId,
                                      exp.id,
                                    );
                                    if (r.error) Alert.alert("Error", r.error);
                                  },
                                },
                              ],
                            );
                          }}
                        >
                          <Text style={styles.delMini}>Delete</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

        {tab === "members" ? (
          <View style={styles.section}>
            {members.map((m) => {
              const isMe = m.email.toLowerCase() === myEmail;
              return (
                <View key={m.id} style={styles.memberCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(m.display_name || m.email)[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {m.display_name}
                      {isMe ? " (You)" : ""}
                    </Text>
                    <Text style={styles.memberMeta}>
                      {m.role} · {m.email}
                    </Text>
                  </View>
                  {isCreator && !isMe && m.role !== "admin" ? (
                    <TouchableOpacity
                      onPress={async () => {
                        const r = await leaveGroup(groupId, myEmail, m.email);
                        if (!r.success) {
                          Alert.alert(
                            "Can't remove",
                            r.error +
                              (r.amount
                                ? ` (${formatSplitRupeeExact(r.amount)})`
                                : ""),
                          );
                        }
                      }}
                    >
                      <Text style={styles.delMini}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                  {!isCreator && isMe ? (
                    <TouchableOpacity
                      onPress={async () => {
                        const r = await leaveGroup(groupId, myEmail);
                        if (!r.success) {
                          Alert.alert(
                            "Can't leave",
                            r.error +
                              (r.amount
                                ? ` — settle ${formatSplitRupeeExact(r.amount)} first`
                                : ""),
                          );
                          return;
                        }
                        router.replace("/(tabs)/split");
                      }}
                    >
                      <Text style={styles.delMini}>Leave</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {tab === "settlements" ? (
          <View style={styles.section}>
            {settlements.length === 0 ? (
              <Text style={styles.muted}>No settlements yet</Text>
            ) : (
              settlements.map((s) => {
                const iPaid = s.from_email.toLowerCase() === myEmail;
                const label = iPaid
                  ? `You paid ${s.to_name || s.to_email}`
                  : s.to_email.toLowerCase() === myEmail
                    ? `${s.from_name || s.from_email} paid you`
                    : `${s.from_name || s.from_email} → ${s.to_name || s.to_email}`;
                return (
                  <View key={s.id} style={styles.settleCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expTitle}>{label}</Text>
                      <Text style={styles.expMeta}>
                        {(s.completed_at || s.created_at || "")
                          .toString()
                          .slice(0, 10)}{" "}
                        · {(s.payment_method || "upi").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.expAmt, { color: Colors.success }]}>
                      {formatSplitRupeeExact(s.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Settle sheet */}
      {showSettle ? (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowSettle(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Record a payment</Text>
            <Text style={styles.fieldLabel}>You paid</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {members
                .filter((m) => m.email.toLowerCase() !== myEmail)
                .map((m) => (
                  <TouchableOpacity
                    key={m.email}
                    onPress={() => setSettleTo(m.email)}
                    style={[
                      styles.chip,
                      settleTo === m.email && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        settleTo === m.email && styles.chipTextActive,
                      ]}
                    >
                      {m.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={settleAmt}
              onChangeText={setSettleAmt}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Payment method
            </Text>
            <View style={styles.methodRow}>
              {(["upi", "cash", "bank"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPayMethod(m)}
                  style={[
                    styles.methodChip,
                    payMethod === m && styles.methodChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      payMethod === m && styles.methodTextActive,
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              label={savingSettle ? "Saving…" : "Record payment"}
              onPress={recordSettlement}
              loading={savingSettle}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      ) : null}

      {/* Invite sheet */}
      {showInvite ? (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowInvite(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Invite friends</Text>
            <View style={styles.inviteBox}>
              <Text style={styles.inviteUrl} selectable>
                {inviteUrl}
              </Text>
            </View>
            {activeGroup?.invite_code ? (
              <Text style={styles.codeHint}>
                Or share code:{" "}
                <Text style={{ fontWeight: "900", color: Colors.primary }}>
                  {activeGroup.invite_code}
                </Text>
              </Text>
            ) : null}
            <Button
              label="Share link"
              onPress={() =>
                Share.share({
                  message: `Join "${activeGroup?.name}" on Finkoin Split: ${inviteUrl}`,
                })
              }
              style={{ marginTop: 16 }}
            />
            <Button
              label="Done"
              variant="ghost"
              onPress={() => setShowInvite(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    margin: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadow.strong,
  },
  headerTop: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerEmoji: { fontSize: 40 },
  headerName: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#fff",
    marginTop: 8,
    textAlign: "center",
  },
  headerMeta: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  inviteBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  inviteBtnText: { color: "#fff", fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.xl,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: "700",
    marginBottom: 4,
  },
  statVal: { fontSize: FontSize.md, fontWeight: "800" },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    padding: Spacing.xl,
  },
  ctaSecondary: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: {
    fontWeight: "800",
    color: Colors.primary,
    fontSize: FontSize.base,
  },
  ctaPrimary: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimaryText: {
    fontWeight: "800",
    color: "#fff",
    fontSize: FontSize.base,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "capitalize",
  },
  tabTextActive: { color: "#fff", fontWeight: "800" },
  section: { padding: Spacing.xl },
  blockTitle: {
    fontSize: FontSize.base,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  muted: { color: Colors.textMuted, fontSize: FontSize.md, lineHeight: 20 },
  edgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  edgeText: { fontWeight: "700", color: Colors.textPrimary },
  edgeAmt: { color: Colors.textMuted, marginTop: 2, fontSize: FontSize.md },
  miniSettle: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.round,
  },
  miniSettleText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: FontSize.sm,
  },
  waiting: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  balanceName: { fontWeight: "700", color: Colors.textPrimary },
  expCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  expIcon: { fontSize: 22 },
  expTitle: {
    fontWeight: "700",
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  expMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  expAmt: {
    fontWeight: "800",
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  delMini: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: "700",
    marginTop: 4,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: "800",
  },
  memberName: { fontWeight: "700", color: Colors.textPrimary },
  memberMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: 8,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    zIndex: 50,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontWeight: "600", color: Colors.textMuted },
  chipTextActive: { color: Colors.primary, fontWeight: "800" },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  methodRow: { flexDirection: "row", gap: 8 },
  methodChip: {
    flex: 1,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  methodText: { fontWeight: "700", color: Colors.textMuted },
  methodTextActive: { color: Colors.primary },
  inviteBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  inviteUrl: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: FontSize.md,
  },
  codeHint: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
