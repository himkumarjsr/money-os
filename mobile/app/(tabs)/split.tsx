import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type SplitGroup = {
  id: string;
  name: string;
  emoji?: string | null;
  group_type?: string | null;
};

export default function SplitScreen() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user?.id) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("split_group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);

    const { data } = await supabase
      .from("split_groups")
      .select("*")
      .in("id", groupIds)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    setGroups((data as SplitGroup[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const createGroup = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);

    try {
      const { data: group, error } = await supabase
        .from("split_groups")
        .insert({
          name: newName.trim(),
          emoji: "💰",
          group_type: "general",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const { error: memberErr } = await supabase
        .from("split_group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          email: user.email,
          display_name: user.name || user.email?.split("@")[0] || "You",
          role: "admin",
          status: "active",
          joined_at: new Date().toISOString(),
        });

      if (memberErr) throw memberErr;

      setShowCreate(false);
      setNewName("");
      await loadGroups();
      router.push(`/split/${group.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not create group";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
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
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>FK Split</Text>
          <Text style={styles.summarySub}>
            Split bills with friends. Free forever.
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>
              Create a group for your trip, flat or office expenses
            </Text>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => router.push(`/split/${group.id}`)}
                style={styles.groupCard}
              >
                <View style={styles.groupEmoji}>
                  <Text style={styles.groupEmojiText}>
                    {group.emoji || "💰"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <Text style={styles.groupType}>
                    {group.group_type || "general"}
                  </Text>
                </View>
                <Text style={styles.groupArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.createSection}>
          <Button
            label="+ Create new group"
            onPress={() => {
              if (!user) {
                router.push("/(auth)/login");
                return;
              }
              setShowCreate(true);
            }}
          />
        </View>
      </ScrollView>

      {showCreate ? (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => {
              setShowCreate(false);
              setNewName("");
            }}
          />
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create group</Text>
            <Input
              label="Group name"
              value={newName}
              onChangeText={setNewName}
              placeholder="Goa Trip 2026"
              autoFocus
            />
            <View style={{ height: 16 }} />
            <Button
              label={creating ? "Creating..." : "Create group"}
              onPress={createGroup}
              loading={creating}
              disabled={!newName.trim()}
            />
            <View style={{ height: 8 }} />
            <Button
              label="Cancel"
              onPress={() => {
                setShowCreate(false);
                setNewName("");
              }}
              variant="ghost"
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    ...Shadow.strong,
  },
  summaryTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  summarySub: {
    fontSize: FontSize.base,
    color: "rgba(255,255,255,0.7)",
  },
  center: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  groupsList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  groupEmoji: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  groupEmojiText: { fontSize: 24 },
  groupName: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  groupType: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  groupArrow: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
  },
  createSection: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalHandle: {
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
    marginBottom: Spacing.xl,
  },
});
