/**
 * Policy vault — port of web components/policies/PolicyVaultClient.tsx.
 * `?add=term|health&cover=&premium=&freq=` opens the add sheet prefilled
 * (same contract as the PWA, used by Analyse / calculators).
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PolicyCard } from "@/components/policies/PolicyCard";
import { PolicyFormSheet } from "@/components/policies/PolicyFormSheet";
import {
  RenewOptionsSheet,
  TransferGuideSheet,
} from "@/components/policies/PolicyActionSheets";
import { Colors } from "@/constants/theme";
import {
  emptyPolicyForm,
  fetchUserPolicies,
  getSupabaseAuthUserId,
  policyToForm,
  updateUserPolicy,
  type PolicyFormInput,
  type PremiumFrequency,
  type UserPolicy,
} from "@/lib/policyVault";
import { useAuthStore } from "@/store/authStore";

function showMarketplaceSoon() {
  Alert.alert(
    "Coming soon",
    "Plan comparison and the insurance marketplace are coming to the app soon.",
  );
}

export default function PoliciesScreen() {
  const params = useLocalSearchParams<{
    add?: string;
    cover?: string;
    premium?: string;
    freq?: string;
  }>();
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authUserId = useAuthStore((s) => s.user?.id);

  const [policies, setPolicies] = useState<UserPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [renewFor, setRenewFor] = useState<UserPolicy | null>(null);
  const [transferFor, setTransferFor] = useState<UserPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormInput>(() => emptyPolicyForm());
  const [formKey, setFormKey] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const uid = await getSupabaseAuthUserId();
    if (!uid) {
      setPolicies([]);
      setLoading(false);
      setLoadError(
        isLoggedIn
          ? "No Supabase session — policies need a real login (Google or email). Phone login must complete OTP so a session exists. Sign out and sign in again if this persists."
          : null,
      );
      return;
    }
    setLoadError(null);
    const { policies: list, error } = await fetchUserPolicies(uid);
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      setPolicies([]);
      return;
    }
    setPolicies(list);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload();
  }, [reload, authUserId, hasInitialized, isLoggedIn]);

  useEffect(() => {
    const add = params.add;
    if (!add || !hasInitialized || !isLoggedIn) return;
    if (add !== "term" && add !== "health") return;
    const cover = Number(params.cover) || 0;
    const premium = Number(params.premium) || 0;
    const freq: PremiumFrequency =
      params.freq === "yearly" ? "yearly" : "monthly";
    const base = emptyPolicyForm();
    setForm({
      ...base,
      policyType: add === "term" ? "term_life" : "health",
      coverAmount: cover || base.coverAmount,
      premiumAmount: premium || base.premiumAmount,
      premiumFrequency: premium ? freq : base.premiumFrequency,
    });
    setEditId(null);
    setFormKey((k) => k + 1);
    setAddOpen(true);
    router.setParams({
      add: undefined,
      cover: undefined,
      premium: undefined,
      freq: undefined,
    });
  }, [params.add, params.cover, params.premium, params.freq, hasInitialized, isLoggedIn]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");
  const goLogin = () => router.push("/(auth)/login");

  const openNew = () => {
    setForm(emptyPolicyForm());
    setEditId(null);
    setFormKey((k) => k + 1);
    setAddOpen(true);
  };

  const openEdit = (p: UserPolicy) => {
    setForm(policyToForm(p));
    setEditId(p.id);
    setFormKey((k) => k + 1);
    setAddOpen(true);
  };

  const markTransferred = async (p: UserPolicy) => {
    const { error } = await updateUserPolicy(p.id, {
      status: "transferred_to_finkoin",
    });
    if (error) {
      Alert.alert("Could not update policy", error.message);
      return;
    }
    setTransferFor(null);
    void reload();
  };

  if (!hasInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          isLoggedIn ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={Colors.primary}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
            />
          ) : undefined
        }
      >
        <Pressable
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>My insurance policies</Text>
            <Text style={styles.sub}>Track all your policies in one place</Text>
          </View>
          <Pressable
            onPress={isLoggedIn ? openNew : goLogin}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
          >
            <Text style={styles.addBtnText}>+ Add policy</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Could not load policies: {loadError}. If you just added this
              feature, run the Supabase migration for{" "}
              <Text style={styles.code}>user_policies</Text>.
            </Text>
          </View>
        ) : null}

        {!isLoggedIn ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <AppIcon name="shield" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              Sign in to use your policy vault
            </Text>
            <Text style={styles.emptySub}>
              Save policies to Supabase, get renewal reminders, and sync across
              devices.
            </Text>
            <Pressable
              onPress={goLogin}
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Sign in →</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : policies.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <AppIcon name="shield" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No policies added yet</Text>
            <Text style={styles.emptySub}>
              Add your insurance policies to track premiums and coverage, or
              explore plans on the marketplace.
            </Text>
            <View style={{ gap: 12, alignSelf: "stretch" }}>
              <Pressable
                onPress={openNew}
                style={styles.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Add first policy →</Text>
              </Pressable>
              <Pressable
                onPress={showMarketplaceSoon}
                style={styles.secondaryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText}>
                  Browse marketplace →
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {policies.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onRenew={() => setRenewFor(p)}
                onTransfer={() => setTransferFor(p)}
                onEdit={() => openEdit(p)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <PolicyFormSheet
        key={formKey}
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        editId={editId}
        initial={form}
        onSaved={() => {
          setAddOpen(false);
          void reload();
        }}
      />

      <RenewOptionsSheet
        policy={renewFor}
        onClose={() => setRenewFor(null)}
        onCompare={() => {
          setRenewFor(null);
          showMarketplaceSoon();
        }}
        onStartTransfer={(p) => {
          setRenewFor(null);
          setTransferFor(p);
        }}
      />

      <TransferGuideSheet
        policy={transferFor}
        onClose={() => setTransferFor(null)}
        onMarkTransferred={markTransferred}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120 },
  back: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  backText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  h1: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: { marginTop: 4, fontSize: 15, color: Colors.textMuted },
  addBtn: {
    backgroundColor: Colors.primary,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  errorBox: {
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: { fontSize: 14, color: "#78350F", lineHeight: 20 },
  code: {
    fontFamily: "Menlo",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  empty: {
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    minHeight: 48,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    minHeight: 48,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  loading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },
});
