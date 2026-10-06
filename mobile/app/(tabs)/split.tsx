/**
 * FK Split — groups list (PWA `/split`).
 * Logged-out: marketing landing (PWA SplitMarketingLanding).
 * Logged-in: groups list + create / invite / join sheets.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
  AppState,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { getSupabase } from "@/lib/supabase";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";

const FEATURES = [
  {
    t: "Groups for trips & flatmates",
    d: "One space per trip, PG, or friend circle — keep balances tidy.",
  },
  {
    t: "Add expenses in seconds",
    d: "Log who paid, split equally or your way, and move on.",
  },
  {
    t: "Clear settle-up view",
    d: "See simplified debts so you know exactly who to pay.",
  },
  {
    t: "Invite with a link",
    d: "Friends join without a long setup. Works on mobile.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    t: "Create a group",
    d: "Name it for a trip, flat, or weekend outing.",
  },
  {
    n: "2",
    t: "Invite friends",
    d: "Share a link — they join and can add expenses too.",
  },
  {
    n: "3",
    t: "Add spends & settle",
    d: "See balances and settle up when the trip ends.",
  },
] as const;

export default function SplitScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn || !user?.id) return <SplitMarketingLanding />;
  return <SplitHomeInner />;
}

function SplitMarketingLanding() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.landingContent}
      >
        <View style={styles.landingHero}>
          <Text style={styles.landingEyebrow}>FINKOIN SPLIT</Text>
          <Text style={styles.landingTitle}>
            Split expenses with friends — simply
          </Text>
          <Text style={styles.landingSub}>
            Free group expense tracker for India. Trips, flatmates, dinners —
            track who paid, who owes, and settle without awkward maths. A clean
            Splitwise-style alternative.
          </Text>
          <TouchableOpacity
            style={styles.landingPrimary}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.85}
          >
            <Text style={styles.landingPrimaryText}>
              Create free Split account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.landingSecondary}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.landingSecondaryText}>Log in</Text>
          </TouchableOpacity>
          <Text style={styles.landingFine}>
            Free forever for core splitting · Mobile-friendly · Made for India
          </Text>
        </View>

        <Text style={styles.landingH2}>Why people use Finkoin Split</Text>
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.t} style={styles.featureCard}>
              <Text style={styles.featureTitle}>{f.t}</Text>
              <Text style={styles.featureDesc}>{f.d}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.landingH2}>How Split works</Text>
        <View style={styles.stepList}>
          {STEPS.map((s) => (
            <View key={s.n} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.featureDesc}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteLinkShare({
  inviteUrl,
  groupName,
}: {
  inviteUrl: string;
  groupName: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const shareText = `Join "${groupName}" on Finkoin Split and we'll track shared expenses together: ${inviteUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Copy this invite link:", inviteUrl);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL(waHref).catch(() => {
      Alert.alert("Could not open WhatsApp", inviteUrl);
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.inviteBox}>
        <Text style={styles.inviteLabel}>INVITE LINK</Text>
        <Text style={styles.inviteUrl} selectable>
          {inviteUrl}
        </Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={() => void copyLink()}
          activeOpacity={0.85}
        >
          <AppIcon
            name={copied ? "check" : "doc"}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.waBtn}
          onPress={openWhatsApp}
          activeOpacity={0.85}
        >
          <AppIcon name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.waBtnText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheetHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Text style={styles.sheetSub}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <AppIcon name="close" size={16} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function SplitHomeInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";
  const email = (user?.email ?? "").toLowerCase();
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "You";

  const groups = useSplitStore((s) => s.groups);
  const loading = useSplitStore((s) => s.loading);
  const fetchGroups = useSplitStore((s) => s.fetchGroups);
  const createGroup = useSplitStore((s) => s.createGroup);
  const deleteGroup = useSplitStore((s) => s.deleteGroup);
  const inviteLinkFor = useSplitStore((s) => s.inviteLink);
  const joinInvite = useSplitStore((s) => s.joinInvite);

  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(groups.length > 0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"details" | "invite">(
    "details",
  );
  const [gName, setGName] = useState("");
  const [gEmoji, setGEmoji] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");

  const load = useCallback(async () => {
    if (!userId || !email) return;
    await fetchGroups(userId, email, true);
    setHasLoaded(true);
  }, [email, fetchGroups, userId]);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      void load();
    }, 500);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") scheduleRefresh();
    });
    return () => {
      sub.remove();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!userId || !email) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`my_groups:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_group_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          scheduleRefresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [email, scheduleRefresh, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resetCreateModal = () => {
    setCreateOpen(false);
    setCreateStep("details");
    setCreateError("");
    setGName("");
    setGEmoji("");
    setCreatedGroupId(null);
    setInviteLink("");
    setBusy(false);
  };

  const openCreateModal = () => {
    setCreateStep("details");
    setCreateError("");
    setGName("");
    setGEmoji("");
    setCreatedGroupId(null);
    setInviteLink("");
    setBusy(false);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!gName.trim() || !email || !userId) {
      setCreateError("Please enter a name.");
      return;
    }
    setBusy(true);
    setCreateError("");
    const { groupId, error } = await createGroup({
      name: gName.trim(),
      emoji: gEmoji.trim(),
      type: "general",
      userId,
      userEmail: email,
      userName: displayName,
    });
    if (error || !groupId) {
      setBusy(false);
      setCreateError(error ?? "Could not create. Please try again.");
      return;
    }

    setCreatedGroupId(groupId);
    const inviteRes = await inviteLinkFor(groupId, gName.trim());
    setBusy(false);
    void load();

    if (inviteRes.inviteUrl) {
      setInviteLink(inviteRes.inviteUrl);
      setCreateStep("invite");
      return;
    }

    setCreateError(
      inviteRes.error
        ? `Created, but invite link failed: ${inviteRes.error}`
        : "Created, but invite link could not be generated.",
    );
    setCreateStep("invite");
  };

  const finishCreate = () => {
    const id = createdGroupId;
    resetCreateModal();
    if (id) {
      router.push({ pathname: "/split/[groupId]", params: { groupId: id } });
    }
  };

  const closeCreate = () => {
    if (createStep === "invite") finishCreate();
    else resetCreateModal();
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      `Close "${groupName}"?`,
      "This closes the group for everyone. Only the group creator can do this. Your expense history is kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close group",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteGroup(groupId);
            if (!ok) {
              Alert.alert(
                "Could not close group. Only the group creator can close it.",
              );
            }
          },
        },
      ],
    );
  };

  const openJoin = () => {
    setJoinCode("");
    setJoinError("");
    setJoinBusy(false);
    setJoinOpen(true);
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Enter an invite code");
      return;
    }
    setJoinBusy(true);
    setJoinError("");
    const res = await joinInvite({
      code,
      userId,
      userEmail: email,
      userName: displayName,
    });
    setJoinBusy(false);
    if (res.error || !res.groupId) {
      setJoinError(res.error || "Could not join group");
      return;
    }
    setJoinOpen(false);
    setJoinCode("");
    void load();
    router.push({
      pathname: "/split/[groupId]",
      params: { groupId: res.groupId },
    });
  };

  const showLoader = loading && !hasLoaded && groups.length === 0;
  const nameMissing = !gName.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>FINKOIN SPLIT</Text>
              <Text style={styles.heroTitle}>Split expenses with friends</Text>
              <Text style={styles.heroSub}>₹ first. No ads. Free forever.</Text>
            </View>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <Text style={styles.heroBtnText}>+ New group</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Groups</Text>
              <Text style={styles.tileValue}>{groups.length}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Quick tip</Text>
              <Text style={styles.tileTip}>
                Add an expense → balances update instantly
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.joinBtn}
            onPress={openJoin}
            activeOpacity={0.85}
          >
            <Text style={styles.joinBtnText}>Join with code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>YOUR GROUPS</Text>
          <TouchableOpacity
            onPress={() => void load()}
            hitSlop={12}
            style={styles.refreshBtn}
          >
            <Text style={styles.refresh}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {showLoader ? (
            <View style={styles.loaderCard}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loaderText}>Loading…</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <AppIcon name="users" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptySub}>
                Create a group for a trip, flat, office, or event.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={openCreateModal}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  Create your first group
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.id} style={styles.groupCard}>
                <TouchableOpacity
                  style={styles.groupMain}
                  onPress={() =>
                    router.push({
                      pathname: "/split/[groupId]",
                      params: { groupId: g.id },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.emojiBox}>
                    {g.emoji ? (
                      <Text style={styles.emojiText}>{g.emoji}</Text>
                    ) : (
                      <AppIcon name="users" size={22} color={Colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.groupMeta}>INR</Text>
                  </View>
                </TouchableOpacity>
                {g.created_by && g.created_by === userId ? (
                  <TouchableOpacity
                    onPress={() => handleDeleteGroup(g.id, g.name)}
                    style={styles.deleteBtn}
                    accessibilityLabel="Delete group"
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.chevronBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/split/[groupId]",
                      params: { groupId: g.id },
                    })
                  }
                  accessibilityLabel={`Open ${g.name}`}
                >
                  <Text style={styles.chevron}>→</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={createOpen} onClose={closeCreate} scroll>
        <SheetHeader
          title={createStep === "invite" ? "Invite friends" : "Create"}
          subtitle={
            createStep === "invite"
              ? "Share this link on WhatsApp or copy it."
              : "You’ll be added as admin."
          }
          onClose={closeCreate}
        />
        {createStep === "details" ? (
          <View style={styles.sheetBody}>
            <View>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={gName}
                onChangeText={(t) => {
                  setGName(t);
                  if (createError) setCreateError("");
                }}
                placeholder="Goa trip / Flat expenses"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                returnKeyType="next"
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Icon (optional)</Text>
              <TextInput
                style={styles.input}
                value={gEmoji}
                onChangeText={setGEmoji}
                placeholder="Optional emoji"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!busy && !nameMissing) void handleCreate();
                }}
              />
            </View>
            {createError ? (
              <Text style={styles.errorBox}>{createError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                styles.fullBtn,
                (busy || nameMissing) && styles.disabled,
              ]}
              disabled={busy || nameMissing}
              onPress={() => void handleCreate()}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : null}
              <Text style={styles.primaryBtnText}>
                {busy ? "Creating…" : "Create & get invite link"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sheetBody}>
            <Text style={styles.readyText}>“{gName.trim()}” is ready</Text>
            {inviteLink ? (
              <InviteLinkShare
                inviteUrl={inviteLink}
                groupName={gName.trim() || "Split"}
              />
            ) : (
              <Text style={styles.warnBox}>
                {createError ||
                  "Invite link unavailable. Open the split and tap Invite."}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, styles.fullBtn]}
              onPress={finishCreate}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={joinOpen} onClose={() => setJoinOpen(false)} scroll>
        <SheetHeader
          title="Join a group"
          subtitle="Enter the 8‑character invite code"
          onClose={() => setJoinOpen(false)}
        />
        <View style={styles.sheetBody}>
          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={(t) => {
              setJoinCode(t.toUpperCase());
              if (joinError) setJoinError("");
            }}
            placeholder="ABCD2345"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!joinBusy) void handleJoin();
            }}
          />
          {joinError ? <Text style={styles.errorBox}>{joinError}</Text> : null}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              styles.fullBtn,
              (joinBusy || !joinCode.trim()) && styles.disabled,
            ]}
            disabled={joinBusy || !joinCode.trim()}
            onPress={() => void handleJoin()}
            activeOpacity={0.85}
          >
            {joinBusy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : null}
            <Text style={styles.primaryBtnText}>
              {joinBusy ? "Joining…" : "Join group"}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 120 },

  hero: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
    ...Shadow.strong,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.lg },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.8)",
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: Spacing.sm,
    lineHeight: 29,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: Spacing.sm,
  },
  heroBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  tiles: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  tile: {
    flex: 1,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: Spacing.lg,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  tileValue: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  tileTip: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: Spacing.xs,
    lineHeight: 19,
  },
  joinBtn: {
    marginTop: Spacing.md,
    minHeight: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textMuted,
  },
  refreshBtn: { minHeight: 44, justifyContent: "center" },
  refresh: { fontSize: 12, fontWeight: "700", color: Colors.primary },

  list: { gap: Spacing.md, marginTop: Spacing.xs },
  loaderCard: {
    minHeight: 140,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  loaderText: { fontSize: FontSize.md, color: Colors.textMuted },
  empty: {
    alignItems: "center",
    padding: 28,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 72,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    ...Shadow.card,
  },
  groupMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 24 },
  groupName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  groupMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#F5D0D0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { fontSize: 12, fontWeight: "700", color: "#C0392B" },
  chevronBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: { fontSize: 14, fontWeight: "700", color: "#94A3B8" },

  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  fullBtn: { alignSelf: "stretch", marginTop: Spacing.xs },
  disabled: { opacity: 0.5 },

  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  sheetSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { marginTop: Spacing.xl, gap: Spacing.lg },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },
  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontWeight: "500",
    overflow: "hidden",
  },
  warnBox: {
    borderRadius: Radius.md,
    backgroundColor: "#FFFBEB",
    color: "#92400E",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    overflow: "hidden",
  },
  readyText: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  codeInput: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.primary,
    textAlign: "center",
    backgroundColor: Colors.background,
  },

  inviteBox: {
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: Colors.textMuted,
  },
  inviteUrl: {
    marginTop: Spacing.xs,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  inviteActions: { flexDirection: "row", gap: Spacing.sm },
  copyBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  copyBtnText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  waBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: "#25D366",
  },
  waBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  landingContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  landingHero: { alignItems: "center", paddingTop: 40, paddingBottom: 40 },
  landingEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.primary,
  },
  landingTitle: {
    marginTop: Spacing.md,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: "#1A1824",
    textAlign: "center",
  },
  landingSub: {
    marginTop: Spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
    textAlign: "center",
  },
  landingPrimary: {
    marginTop: Spacing.xxxl,
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.strong,
  },
  landingPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  landingSecondary: {
    marginTop: Spacing.md,
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.25)",
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  landingSecondaryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  landingFine: {
    marginTop: Spacing.lg,
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
  },
  landingH2: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: "#1A1824",
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  featureList: { gap: Spacing.md, marginTop: Spacing.xl, marginBottom: 40 },
  featureCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  featureTitle: { fontSize: 17, fontWeight: "600", color: Colors.primary },
  featureDesc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  stepList: { gap: Spacing.xxl, marginTop: Spacing.xl },
  stepRow: { flexDirection: "row", gap: Spacing.lg },
  stepNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stepTitle: { fontSize: 17, fontWeight: "600", color: "#1A1824" },
});
