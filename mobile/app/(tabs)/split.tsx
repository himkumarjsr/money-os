/**
 * FK Split — groups list (PWA `/split` logged-in view).
 */
import { useCallback, useEffect, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SplitScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { groups, loading, fetchGroups, createGroup, deleteGroup } =
    useSplitStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<"details" | "invite">("details");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💰");
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!user?.id || !user.email) return;
      await fetchGroups(user.id, user.email, force);
    },
    [user?.id, user?.email, fetchGroups],
  );

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Finkoin Split</Text>
          <Text style={styles.heroSub}>
            Split expenses with friends. ₹ first. No ads. Free forever.
          </Text>
        </View>
        <View style={styles.loginPad}>
          <Text style={styles.emptyTitle}>Sign in to use Split</Text>
          <Text style={styles.emptySub}>
            Create groups, add expenses, and settle up with friends.
          </Text>
          <Button
            label="Log in"
            onPress={() => router.push("/(auth)/login")}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Enter a group name");
      return;
    }
    setCreating(true);
    const res = await createGroup({
      name: name.trim(),
      emoji: emoji.trim() || "💰",
      type: "general",
      userId: user.id,
      userEmail: user.email!,
      userName: user.name || user.email!.split("@")[0],
    });
    setCreating(false);
    if (res.error || !res.groupId) {
      Alert.alert("Error", res.error || "Could not create group");
      return;
    }
    setCreatedId(res.groupId);
    const link = await useSplitStore.getState().inviteLink(res.groupId);
    setInviteUrl(link.inviteUrl || "");
    setStep("invite");
    await load(true);
  };

  const handleDelete = (id: string, gName: string) => {
    Alert.alert(
      "Close group?",
      `Close "${gName}"? Only the group creator can do this. Members keep history until cleaned up.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete group",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteGroup(id);
            if (!ok) Alert.alert("Error", "Could not close group");
            else await load(true);
          },
        },
      ],
    );
  };

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
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Finkoin Split</Text>
          <Text style={styles.heroSub}>Split expenses with friends</Text>
          <Text style={styles.heroTag}>₹ first. No ads. Free forever.</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryChip}
            onPress={() => {
              setShowCreate(true);
              setStep("details");
              setName("");
              setEmoji("💰");
              setCreatedId(null);
            }}
          >
            <Text style={styles.primaryChipText}>+ New group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryChip}
            onPress={() => setShowJoin(true)}
          >
            <Text style={styles.secondaryChipText}>Join with code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{groups.length}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={[styles.statCard, { flex: 2 }]}>
            <Text style={styles.tipTitle}>Quick tip</Text>
            <Text style={styles.tipBody}>
              Add an expense → balances update instantly
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your groups</Text>
          <TouchableOpacity onPress={() => void load(true)}>
            <Text style={styles.refresh}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading && groups.length === 0 ? (
          <Text style={styles.loading}>Loading groups…</Text>
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>
              Create a group for your trip, flat or office expenses
            </Text>
            <Button
              label="Create your first group"
              onPress={() => setShowCreate(true)}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <View style={styles.list}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.groupCard}
                onPress={() => router.push(`/split/${g.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.emojiBox}>
                  <Text style={styles.emojiText}>{g.emoji || "💰"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={styles.groupMeta}>INR</Text>
                </View>
                {g.created_by === user.id ? (
                  <TouchableOpacity
                    onPress={() => handleDelete(g.id, g.name)}
                    hitSlop={10}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.chevron}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create modal */}
      {showCreate ? (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowCreate(false)}
          />
          <View style={styles.modal}>
            <View style={styles.handle} />
            {step === "details" ? (
              <>
                <Text style={styles.modalTitle}>Create</Text>
                <Text style={styles.modalSub}>
                  You&apos;ll be added as admin.
                </Text>
                <Input
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Goa trip / Flat expenses"
                  autoFocus
                />
                <View style={{ height: 12 }} />
                <Input
                  label="Icon (optional)"
                  value={emoji}
                  onChangeText={setEmoji}
                  placeholder="💰"
                />
                <Button
                  label={creating ? "Creating…" : "Create & get invite link"}
                  onPress={handleCreate}
                  loading={creating}
                  style={{ marginTop: 20 }}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setShowCreate(false)}
                  style={{ marginTop: 8 }}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Invite friends</Text>
                <Text style={styles.modalSub}>{name.trim()} is ready</Text>
                <View style={styles.inviteBox}>
                  <Text style={styles.inviteUrl} numberOfLines={3}>
                    {inviteUrl || "Invite link ready"}
                  </Text>
                </View>
                <Button
                  label="Share invite link"
                  onPress={() => {
                    if (inviteUrl) {
                      void Share.share({
                        message: `Join "${name.trim()}" on Finkoin Split: ${inviteUrl}`,
                      });
                    }
                  }}
                  style={{ marginTop: 12 }}
                />
                <Button
                  label="Continue"
                  variant="secondary"
                  onPress={() => {
                    setShowCreate(false);
                    if (createdId) router.push(`/split/${createdId}`);
                  }}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* Join by code */}
      {showJoin ? (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowJoin(false)}
          />
          <View style={styles.modal}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Join a group</Text>
            <Text style={styles.modalSub}>
              Enter the 8‑character invite code
            </Text>
            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="ABCD2345"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Button
              label="Join group"
              onPress={async () => {
                const res = await useSplitStore.getState().joinByCode({
                  code: joinCode,
                  userId: user.id,
                  userEmail: user.email!,
                  userName: user.name || user.email!.split("@")[0],
                });
                if (res.error || !res.groupId) {
                  Alert.alert("Error", res.error || "Could not join");
                  return;
                }
                setShowJoin(false);
                setJoinCode("");
                router.push(`/split/${res.groupId}`);
              }}
              style={{ marginTop: 16 }}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setShowJoin(false)}
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
  hero: {
    backgroundColor: Colors.primary,
    margin: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    ...Shadow.strong,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#fff",
  },
  heroSub: {
    fontSize: FontSize.base,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  heroTag: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  primaryChip: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryChipText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: FontSize.base,
  },
  secondaryChip: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryChipText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  statVal: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  tipBody: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  refresh: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  loading: {
    textAlign: "center",
    color: Colors.textMuted,
    padding: 32,
  },
  empty: {
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  loginPad: { padding: Spacing.xl },
  list: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 24 },
  groupName: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  groupMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  deleteText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: "700",
  },
  chevron: { fontSize: FontSize.lg, color: Colors.textMuted },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    zIndex: 40,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
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
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  inviteBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  inviteUrl: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "600",
  },
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
});
