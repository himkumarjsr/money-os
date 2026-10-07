/**
 * Group detail — PWA `/split/[groupId]` parity.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "@/store/authStore";
import {
  useSplitStore,
  formatSplitRupee,
  formatSplitRupeeExact,
  getMyNetBalance,
  groupCodeLink,
} from "@/store/splitStore";
import { getSupabase } from "@/lib/supabase";
import type { TrackerIconName } from "@/lib/tracker-categories";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { uniqueChannelName } from "@/lib/realtimeChannel";

type Tab = "expenses" | "members" | "settlements";
type PaymentMethod = "upi" | "cash" | "bank";

const PRIMARY = "#534AB7";
const INK = "#111110";
const MUTED = "#9B9A94";
const BODY = "#5F5E5A";
const BORDER = "#E8E6F0";
const SOFT = "#F7F7F4";
const GREEN = "#1D9E75";
const RED = "#E24B4A";

const SPLIT_CATEGORY_ICON: Record<string, TrackerIconName> = {
  food: "utensils",
  transport: "cab",
  accommodation: "building",
  entertainment: "party",
  shopping: "cart",
  utilities: "bolt",
  medical: "pill",
  other: "package",
  general: "package",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDateIN(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

async function copyText(text: string) {
  if (!text) return false;
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return shareText(text);
  }
}

async function shareText(message: string) {
  try {
    const res = await Share.share({ message });
    return res.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const myEmail = (user?.email ?? "").toLowerCase();

  const loading = useSplitStore((s) => s.loading);
  const group = useSplitStore((s) => s.activeGroup);
  const expenses = useSplitStore((s) => s.expenses);
  const settlements = useSplitStore((s) => s.settlements);
  const balances = useSplitStore((s) => s.balances);
  const netBalances = useSplitStore((s) => s.netBalances);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const inviteLink = useSplitStore((s) => s.inviteLink);
  const inviteByEmail = useSplitStore((s) => s.inviteByEmail);
  const settleUp = useSplitStore((s) => s.settleUp);
  const deleteExpense = useSplitStore((s) => s.deleteExpense);
  const deleteGroup = useSplitStore((s) => s.deleteGroup);
  const leaveGroup = useSplitStore((s) => s.leaveGroup);

  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [refreshing, setRefreshing] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleToEmail, setSettleToEmail] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleMsg, setSettleMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiNote, setUpiNote] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (groupId) void fetchGroupDetail(groupId);
    }, [groupId, fetchGroupDetail]),
  );

  useEffect(() => {
    if (!groupId || !isLoggedIn) return;
    const supabase = getSupabase();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void fetchGroupDetail(groupId);
      }, 400);
    };
    const sub = supabase
      .channel(uniqueChannelName(`split:${groupId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_expenses",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_expense_shares",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_settlements",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(sub);
    };
  }, [fetchGroupDetail, groupId, isLoggedIn]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const groupInviteLink = groupCodeLink(group?.invite_code);
  const members = group?.members ?? [];

  const myNet = useMemo(
    () => getMyNetBalance(myEmail, netBalances),
    [netBalances, myEmail],
  );

  const headerTotals = useMemo(() => {
    const youOwe = balances
      .filter((b) => b.from_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const youAreOwed = balances
      .filter((b) => b.to_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    return { youOwe, youAreOwed };
  }, [balances, myEmail]);

  const myOwedEdges = useMemo(
    () => balances.filter((b) => b.from_email?.toLowerCase() === myEmail),
    [balances, myEmail],
  );

  const otherMembers = useMemo(
    () => members.filter((m) => m.email?.toLowerCase() !== myEmail),
    [members, myEmail],
  );

  const isCreator =
    Boolean(group?.created_by) && group?.created_by === user?.id;

  const onRefresh = async () => {
    if (!groupId) return;
    setRefreshing(true);
    await fetchGroupDetail(groupId);
    setRefreshing(false);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/split");
  };

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteUrl("");
    setInviteMsg("");
    setCopied(false);
    setInviteOpen(true);
    if (!groupId || !group?.name) return;
    setInviteBusy(true);
    void inviteLink(groupId, group.name).then((res) => {
      setInviteBusy(false);
      if (res.error) {
        setInviteMsg(res.error);
        return;
      }
      if (res.inviteUrl) setInviteUrl(res.inviteUrl);
    });
  };

  const copyInviteLink = async () => {
    if (!(await copyText(inviteUrl))) return;
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const text = `Join "${group?.name ?? "Split"}" on Finkoin Split and we'll track shared expenses together: ${inviteUrl}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(
      () => void shareText(text),
    );
  };

  const copyGroupLink = async () => {
    if (await copyText(groupInviteLink)) setInviteMsg("Link copied!");
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!groupId || !group?.name) return;
    if (!email) {
      setInviteMsg("Enter an email address.");
      return;
    }

    setInviteBusy(true);
    setInviteMsg("");
    const res = await inviteByEmail({
      groupId,
      groupName: group.name,
      email,
    });
    setInviteBusy(false);

    if (res.error) {
      setInviteMsg(res.error);
      return;
    }

    if (res.emailSent) {
      setInviteMsg(`Invite sent to ${email} ✓`);
      setInviteEmail("");
    } else if (res.inviteUrl) {
      setInviteUrl(res.inviteUrl);
      setInviteMsg(
        res.emailError
          ? `${res.emailError} Share the link below instead:`
          : "Email not sent — share the link below:",
      );
    } else {
      setInviteMsg("Invite created.");
    }
  };

  const openSettle = (toEmail?: string, amount?: number) => {
    setSettleMsg("");
    setSettleBusy(false);
    setPaymentMethod("upi");
    setUpiNote("");
    const firstOwed = myOwedEdges[0];
    setSettleToEmail(toEmail ?? firstOwed?.to_email ?? "");
    setSettleAmount(
      amount != null
        ? String(Math.round(amount))
        : firstOwed
          ? String(Math.round(Number(firstOwed.amount ?? 0)))
          : "",
    );
    setSettleOpen(true);
  };

  const handleConfirmSettle = async () => {
    const actorId = user?.id;
    if (!groupId || !actorId || !myEmail) return;
    const toEmail = settleToEmail.trim().toLowerCase();
    const amount = Number(settleAmount);
    if (!toEmail) {
      setSettleMsg("Choose who you paid.");
      return;
    }
    if (toEmail === myEmail) {
      setSettleMsg("You cannot settle up with yourself.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSettleMsg("Enter a valid amount.");
      return;
    }
    setSettleBusy(true);
    const res = await settleUp({
      groupId,
      toEmail,
      amount,
      userId: actorId,
      userEmail: myEmail,
      userName: user?.name || undefined,
      paymentMethod,
      notes:
        paymentMethod === "upi" && upiNote.trim() ? upiNote.trim() : undefined,
    });
    setSettleBusy(false);
    if (res.error) {
      setSettleMsg(res.error);
      return;
    }
    setSettleOpen(false);
    setActiveTab("settlements");
  };

  const confirmDeleteExpense = (expenseId: string) => {
    if (!groupId) return;
    Alert.alert(
      "Delete this expense?",
      "This cannot be undone. Balances will be updated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete",
          style: "destructive",
          onPress: async () => {
            const res = await deleteExpense(groupId, expenseId);
            if (res.error) Alert.alert(res.error);
          },
        },
      ],
    );
  };

  const handleLeaveOrRemove = async (email?: string) => {
    if (!groupId) return;
    const res = await leaveGroup(groupId, myEmail, email);
    if (!res.success) {
      const amt =
        res.amount != null ? ` (≈ ${formatSplitRupee(res.amount)})` : "";
      Alert.alert((res.error || "Could not update member") + amt);
      return;
    }
    if (!email) {
      router.replace("/(tabs)/split");
      return;
    }
    void fetchGroupDetail(groupId);
  };

  const confirmDeleteGroup = () => {
    if (!groupId || !group?.name) return;
    Alert.alert(
      `Delete "${group.name}"?`,
      "This will remove the group for all members. Expense history will be saved but the group will be closed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete group",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteGroup(groupId);
            if (!ok) {
              Alert.alert("Could not delete group.");
              return;
            }
            router.replace("/(tabs)/split");
          },
        },
      ],
    );
  };

  const tone = myNet > 0 ? "owed" : myNet < 0 ? "owe" : "settled";
  const netLabel =
    tone === "owed"
      ? "You are owed"
      : tone === "owe"
        ? "You owe"
        : "All settled";
  const netColor = tone === "owed" ? GREEN : tone === "owe" ? RED : MUTED;

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Missing group</Text>
      </SafeAreaView>
    );
  }

  const settleDisabled = settleBusy || !settleToEmail || !settleAmount;
  const inviteDisabled = inviteBusy || !inviteEmail.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={goBack}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <View style={styles.backCircle}>
                  <Text style={styles.backArrow}>←</Text>
                </View>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.titleRow}>
                <View style={styles.emojiTile}>
                  {group?.emoji ? (
                    <Text style={styles.emojiText}>{group.emoji}</Text>
                  ) : (
                    <AppIcon name="users" size={22} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.titleCol}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group?.name || "Group"}
                  </Text>
                  <Text style={styles.groupMeta}>
                    {members.length} members · INR
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              {isCreator ? (
                <TouchableOpacity
                  onPress={confirmDeleteGroup}
                  style={styles.moreBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Group options"
                >
                  <Text style={styles.moreText}>...</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={openInviteModal}
                style={styles.inviteBtn}
                accessibilityRole="button"
              >
                <Text style={styles.inviteBtnText}>Invite</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>You owe</Text>
              <Text
                style={styles.statVal}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatSplitRupee(headerTotals.youOwe)}
              </Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>You are owed</Text>
              <Text
                style={styles.statVal}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatSplitRupee(headerTotals.youAreOwed)}
              </Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>{netLabel}</Text>
              <Text
                style={[styles.statVal, { color: netColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatSplitRupee(Math.abs(myNet))}
              </Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => openSettle()}
              accessibilityRole="button"
            >
              <Text style={styles.ctaSecondaryText}>Settle up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() =>
                router.push({
                  pathname: "/split/[groupId]/add-expense",
                  params: { groupId },
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.ctaPrimaryText}>+ Add expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          {(["expenses", "members", "settlements"] as const).map((t) => {
            const active = activeTab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTab(t)}
                style={[
                  styles.tab,
                  { borderBottomColor: active ? PRIMARY : "transparent" },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabText, { color: active ? PRIMARY : MUTED }]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "expenses" ? (
          <>
            <View style={styles.sectionLg}>
              <View style={styles.sectionHeadRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Simplified settle-up</Text>
                  <Text style={styles.sectionSub}>
                    Fewest payments to clear everyone.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void fetchGroupDetail(groupId)}
                  style={styles.refreshBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stack}>
                {loading ? (
                  <View style={[styles.card, styles.loaderCard]}>
                    <ActivityIndicator color={PRIMARY} />
                    <Text style={styles.loaderText}>Loading…</Text>
                  </View>
                ) : null}

                {!loading && balances.length === 0 ? (
                  <View style={[styles.card, { padding: 24 }]}>
                    <Text style={styles.bodyText}>
                      All settled up. Add an expense to start splitting.
                    </Text>
                  </View>
                ) : null}

                {balances.map((b, idx) => {
                  const iPay = b.from_email?.toLowerCase() === myEmail;
                  return (
                    <View
                      key={`${b.from_email}-${b.to_email}-${idx}`}
                      style={[styles.card, styles.edgeCard]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.edgeTitle} numberOfLines={1}>
                          {iPay ? "You" : b.from_name}{" "}
                          <Text style={{ color: "#94A3B8" }}>→</Text>{" "}
                          {b.to_name}
                        </Text>
                        <Text style={styles.edgeSub} numberOfLines={1}>
                          {iPay ? "You pay" : `${b.from_name} pays`} {b.to_name}
                        </Text>
                      </View>
                      <View style={styles.edgeRight}>
                        <Text style={styles.edgeAmt}>
                          {formatSplitRupee(Number(b.amount ?? 0))}
                        </Text>
                        {iPay ? (
                          <TouchableOpacity
                            onPress={() =>
                              openSettle(b.to_email, Number(b.amount ?? 0))
                            }
                            style={styles.settleBtn}
                            accessibilityRole="button"
                          >
                            <Text style={styles.settleBtnText}>Settle</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {netBalances.some((n) => Math.abs(n.net) > 0.5) ? (
              <View style={styles.sectionLg}>
                <Text style={styles.sectionTitle}>Balances</Text>
                <View style={styles.stack}>
                  {netBalances
                    .filter((n) => Math.abs(n.net) > 0.5)
                    .map((n) => {
                      const isMe = n.email === myEmail;
                      const owed = n.net > 0;
                      return (
                        <View
                          key={n.email}
                          style={[styles.card, styles.balanceCard]}
                        >
                          <Text style={styles.balanceName} numberOfLines={1}>
                            {isMe ? "You" : n.name}
                          </Text>
                          <Text
                            style={[
                              styles.balanceAmt,
                              { color: owed ? GREEN : RED },
                            ]}
                          >
                            {owed ? "gets back" : "owes"}{" "}
                            {formatSplitRupee(Math.abs(n.net))}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionLg}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <View style={[styles.card, styles.listCard, { marginTop: 12 }]}>
                {expenses.length === 0 && !loading ? (
                  <Text style={[styles.bodyText, styles.listEmpty]}>
                    No expenses yet.
                  </Text>
                ) : null}

                {expenses.map((e, i, arr) => {
                  const myShare = (e.shares ?? [])
                    .filter((s) => s.email?.toLowerCase() === myEmail)
                    .reduce((sum, s) => sum + Number(s.share_amount ?? 0), 0);
                  const isExpenseCreator = Boolean(
                    user?.id && e.created_by === user.id,
                  );
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.expRow,
                        i < arr.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.catCircle}>
                        <TrackerIcon
                          name={
                            SPLIT_CATEGORY_ICON[e.category ?? "general"] ??
                            "package"
                          }
                          size={16}
                          color={BODY}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.expTitle} numberOfLines={1}>
                          {e.title}
                        </Text>
                        <Text style={styles.expMeta} numberOfLines={1}>
                          {e.paid_by_name} · {e.expense_date}
                          {myShare > 0
                            ? ` · you ${formatSplitRupeeExact(myShare)}`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.expAmt}>
                        {formatSplitRupeeExact(Number(e.amount ?? 0))}
                      </Text>
                      {isExpenseCreator ? (
                        <View style={styles.expActions}>
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: "/split/[groupId]/add-expense",
                                params: { groupId, edit: e.id },
                              })
                            }
                            style={styles.iconBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Edit expense"
                          >
                            <AppIcon name="pencil" size={15} color={PRIMARY} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDeleteExpense(e.id)}
                            style={styles.iconBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Delete expense"
                          >
                            <AppIcon name="trash" size={15} color={RED} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {activeTab === "members" ? (
          <View style={styles.sectionMd}>
            <View style={[styles.card, styles.listCard]}>
              {members.map((member, i, arr) => {
                const email = member.email.toLowerCase();
                const isMe = email === myEmail;
                const initials = (member.display_name || email)
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <View
                    key={member.id || email}
                    style={[
                      styles.memberRow,
                      i < arr.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {isMe
                          ? `${member.display_name} (You)`
                          : member.display_name}
                      </Text>
                      <Text style={styles.memberMeta} numberOfLines={1}>
                        {member.role} · {member.email}
                      </Text>
                    </View>
                    {member.role !== "admin" && isCreator && !isMe ? (
                      <TouchableOpacity
                        onPress={() => void handleLeaveOrRemove(member.email)}
                        style={styles.pillTarget}
                        accessibilityRole="button"
                      >
                        <View style={styles.dangerPill}>
                          <Text style={styles.dangerPillText}>Remove</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    {isMe && !isCreator ? (
                      <TouchableOpacity
                        onPress={() => void handleLeaveOrRemove()}
                        style={styles.pillTarget}
                        accessibilityRole="button"
                      >
                        <View style={styles.dangerPill}>
                          <Text style={styles.dangerPillText}>Leave</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {activeTab === "settlements" ? (
          <View style={styles.sectionMd}>
            {settlements.length === 0 ? (
              <View style={[styles.card, styles.settleEmpty]}>
                <Text style={styles.settleEmptyText}>No settlements yet</Text>
              </View>
            ) : (
              <View style={[styles.card, styles.listCard]}>
                {settlements.map((s, i) => {
                  const isFromMe = s.from_email?.toLowerCase() === myEmail;
                  const isToMe = s.to_email?.toLowerCase() === myEmail;
                  return (
                    <View
                      key={s.id}
                      style={[
                        styles.memberRow,
                        i < settlements.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.settleTitle}>
                          {isFromMe ? "You" : s.from_email?.split("@")[0]} paid{" "}
                          {isToMe ? "you" : s.to_email?.split("@")[0]}
                        </Text>
                        <Text style={styles.memberMeta}>
                          {formatDateIN(s.completed_at)}
                          {s.payment_method
                            ? ` · ${s.payment_method.toUpperCase()}`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.settleAmt}>
                        {formatSplitRupee(Number(s.amount ?? 0))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        scroll
      >
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Invite friends</Text>
            <Text style={styles.sheetSub}>
              Share a link, or email someone directly.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setInviteOpen(false)}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <AppIcon name="close" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.sheetBody}>
          {inviteBusy && !inviteUrl ? (
            <Text style={styles.mutedSm}>Generating invite link…</Text>
          ) : null}

          {inviteUrl ? (
            <View style={{ gap: 12 }}>
              <View style={styles.linkBox}>
                <Text style={styles.linkLabel}>Invite link</Text>
                <Text style={styles.linkUrl} selectable>
                  {inviteUrl}
                </Text>
              </View>
              <View style={styles.shareRow}>
                <TouchableOpacity
                  onPress={() => void copyInviteLink()}
                  style={styles.copyBtn}
                  accessibilityRole="button"
                >
                  <AppIcon
                    name={copied ? "check" : "doc"}
                    size={16}
                    color={PRIMARY}
                  />
                  <Text style={styles.copyBtnText}>
                    {copied ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openWhatsApp}
                  style={styles.waBtn}
                  accessibilityRole="button"
                >
                  <AppIcon name="phone" size={16} color="#FFFFFF" />
                  <Text style={styles.waBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {groupInviteLink ? (
            <View style={styles.groupLinkSection}>
              <Text style={styles.upperLabel}>Or share group link</Text>
              <View style={styles.groupLinkBox}>
                <Text style={styles.groupLinkUrl} selectable>
                  {groupInviteLink}
                </Text>
                <TouchableOpacity
                  onPress={() => void copyGroupLink()}
                  style={styles.groupCopyBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                >
                  <Text style={styles.groupCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                Anyone with this link can join the group
              </Text>
            </View>
          ) : null}

          <View>
            <Text style={styles.fieldLabel}>Or invite by email</Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="friend@example.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!inviteDisabled) void handleSendInvite();
              }}
              style={styles.input}
            />
          </View>

          {inviteMsg ? <Text style={styles.inviteMsg}>{inviteMsg}</Text> : null}

          <TouchableOpacity
            disabled={inviteDisabled}
            onPress={() => void handleSendInvite()}
            style={[styles.primaryBtn, inviteDisabled && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {inviteBusy ? "Sending…" : "Send email invite"}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={settleOpen}
        onClose={() => setSettleOpen(false)}
        scroll
      >
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Record a payment</Text>
            <Text style={styles.sheetSub}>
              Log money you paid to a group member.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSettleOpen(false)}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <AppIcon name="close" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.fieldLabel}>You paid</Text>
          {otherMembers.length === 0 ? (
            <Text style={[styles.mutedSm, { marginTop: 4 }]}>
              Select member…
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {otherMembers.map((m) => {
                const active =
                  settleToEmail.toLowerCase() === m.email.toLowerCase();
                return (
                  <TouchableOpacity
                    key={m.email}
                    onPress={() => setSettleToEmail(m.email)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                      numberOfLines={1}
                    >
                      {m.display_name}
                    </Text>
                    <Text style={styles.chipSub} numberOfLines={1}>
                      {m.email}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.fieldLabel}>Amount (₹)</Text>
          <TextInput
            value={settleAmount}
            onChangeText={setSettleAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={[styles.upperLabel, { marginBottom: 8 }]}>
            Payment method
          </Text>
          <View style={styles.methodRow}>
            {(["upi", "cash", "bank"] as const).map((method) => {
              const active = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[
                    styles.methodBtn,
                    {
                      borderColor: active ? PRIMARY : BORDER,
                      backgroundColor: active ? "#EEEDFE" : "#FFFFFF",
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.methodText,
                      { color: active ? PRIMARY : MUTED },
                    ]}
                  >
                    {method === "upi"
                      ? "UPI"
                      : method === "bank"
                        ? "Bank"
                        : "Cash"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {paymentMethod === "upi" ? (
            <TextInput
              value={upiNote}
              onChangeText={setUpiNote}
              placeholder="UPI reference / note (optional)"
              placeholderTextColor={MUTED}
              style={[styles.input, { marginTop: 10 }]}
            />
          ) : null}
        </View>

        {settleMsg ? <Text style={styles.settleMsg}>{settleMsg}</Text> : null}

        <TouchableOpacity
          disabled={settleDisabled}
          onPress={() => void handleConfirmSettle()}
          style={[
            styles.primaryBtn,
            { marginTop: 20 },
            settleDisabled && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>
            {settleBusy ? "Saving…" : "Record payment"}
          </Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SOFT },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  header: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  titleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emojiTile: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 20 },
  titleCol: { flex: 1, minWidth: 0 },
  groupName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  groupMeta: {
    marginTop: 2,
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  inviteBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  statsRow: { marginTop: 20, flexDirection: "row", gap: 12 },
  statTile: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 14,
  },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  statVal: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  ctaRow: { marginTop: 20, flexDirection: "row", gap: 12 },
  ctaSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  ctaPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  ctaPrimaryText: { color: PRIMARY, fontSize: 14, fontWeight: "800" },

  tabs: {
    marginTop: 16,
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  sectionLg: { marginTop: 32 },
  sectionMd: { marginTop: 24 },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSub: { marginTop: 4, color: MUTED, fontSize: 12 },
  refreshBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  refreshText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  stack: { marginTop: 12, gap: 8 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  listCard: { overflow: "hidden" },
  loaderCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderText: { color: MUTED, fontSize: 12 },
  bodyText: { color: BODY, fontSize: 14 },
  emptyText: { color: MUTED, fontSize: 14, padding: 24 },
  listEmpty: { paddingHorizontal: 16, paddingVertical: 20 },

  edgeCard: {
    minHeight: 64,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  edgeTitle: { color: INK, fontSize: 14, fontWeight: "700" },
  edgeSub: { marginTop: 4, color: MUTED, fontSize: 12 },
  edgeRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  edgeAmt: { color: INK, fontSize: 14, fontWeight: "800" },
  settleBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  settleBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  balanceName: { flex: 1, color: INK, fontSize: 14, fontWeight: "700" },
  balanceAmt: { fontSize: 14, fontWeight: "800" },

  rowDivider: { borderBottomWidth: 1, borderBottomColor: SOFT },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    minHeight: 60,
  },
  catCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  expTitle: { color: INK, fontSize: 14, fontWeight: "700" },
  expMeta: { marginTop: 2, color: MUTED, fontSize: 11 },
  expAmt: { color: INK, fontSize: 14, fontWeight: "800", textAlign: "right" },
  expActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: PRIMARY, fontSize: 13, fontWeight: "700" },
  memberName: { color: INK, fontSize: 14, fontWeight: "600" },
  memberMeta: { marginTop: 2, color: MUTED, fontSize: 11 },
  pillTarget: { minHeight: 44, justifyContent: "center" },
  dangerPill: {
    borderRadius: 6,
    backgroundColor: "#FCEBEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dangerPillText: { color: RED, fontSize: 11, fontWeight: "700" },

  settleEmpty: { paddingHorizontal: 24, paddingVertical: 40 },
  settleEmptyText: { color: MUTED, fontSize: 14, textAlign: "center" },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: GREEN, fontSize: 18 },
  settleTitle: { color: INK, fontSize: 13, fontWeight: "600" },
  settleAmt: { color: GREEN, fontSize: 14, fontWeight: "700" },

  sheetHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  sheetTitle: { color: INK, fontSize: 16, fontWeight: "800" },
  sheetSub: { marginTop: 4, color: MUTED, fontSize: 12 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { marginTop: 20, gap: 16 },
  mutedSm: { color: MUTED, fontSize: 14 },

  linkBox: {
    borderRadius: 12,
    backgroundColor: SOFT,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  linkLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkUrl: {
    marginTop: 4,
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: MONO,
  },
  shareRow: { flexDirection: "row", gap: 8 },
  copyBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  copyBtnText: { color: PRIMARY, fontSize: 14, fontWeight: "700" },
  waBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#25D366",
  },
  waBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  groupLinkSection: {
    borderTopWidth: 1,
    borderTopColor: SOFT,
    paddingTop: 16,
  },
  upperLabel: {
    marginBottom: 8,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  groupLinkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: SOFT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupLinkUrl: {
    flex: 1,
    color: PRIMARY,
    fontSize: 12,
    fontFamily: MONO,
  },
  groupCopyBtn: {
    borderRadius: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupCopyText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  hint: { marginTop: 6, color: MUTED, fontSize: 11 },

  fieldLabel: { color: BODY, fontSize: 12, fontWeight: "600" },
  input: {
    marginTop: 4,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    fontSize: 16,
    color: INK,
    backgroundColor: "#FFFFFF",
  },
  inviteMsg: { color: BODY, fontSize: 14, fontWeight: "500" },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.5 },

  chipWrap: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    maxWidth: "100%",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  chipActive: { borderColor: PRIMARY, backgroundColor: "#EEEDFE" },
  chipText: { color: INK, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: PRIMARY, fontWeight: "800" },
  chipSub: { color: MUTED, fontSize: 11 },

  methodRow: { flexDirection: "row", gap: 8 },
  methodBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  settleMsg: {
    marginTop: 12,
    color: "#C0392B",
    fontSize: 14,
    fontWeight: "500",
  },
});
