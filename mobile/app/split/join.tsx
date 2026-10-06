/**
 * Join a split group from an invite link — port of web
 * app/split/join/JoinSplitGroupClient.tsx. Opened by finkoin://split/join?…,
 * https://www.finkoin.com/split/join?… (app links) and invite push taps.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";

type JoinStatus = "checking" | "login" | "joining" | "success" | "error";

export default function JoinSplitGroupScreen() {
  const params = useLocalSearchParams<{ token?: string; code?: string }>();
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const code = typeof params.code === "string" ? params.code.trim() : "";
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const joinInvite = useSplitStore((s) => s.joinInvite);
  const fetchGroups = useSplitStore((s) => s.fetchGroups);

  const [status, setStatus] = useState<JoinStatus>("checking");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const joinPath = token
    ? `/split/join?token=${encodeURIComponent(token)}`
    : `/split/join?code=${encodeURIComponent(code)}`;
  const finishedKey = useRef<string | null>(null);
  const attemptRef = useRef(0);

  const runJoin = useCallback(async () => {
    if (!user?.id) return;
    const attempt = ++attemptRef.current;
    setStatus("joining");
    setMessage("");
    const email = (user.email ?? "").toLowerCase();
    const res = await joinInvite({
      token: token || undefined,
      code: code || undefined,
      userId: user.id,
      userEmail: email,
      userName: user.name ?? "",
    });
    if (attempt !== attemptRef.current) return;
    if (res.groupId) {
      finishedKey.current = token ? `token:${token}` : `code:${code}`;
      setGroupName(res.groupName ?? "group");
      setStatus("success");
      if (email) void fetchGroups(user.id, email, true);
      const groupId = res.groupId;
      setTimeout(() => {
        router.replace({ pathname: "/split/[groupId]", params: { groupId } });
      }, 800);
      return;
    }
    if (res.status === 401) {
      setStatus("login");
      return;
    }
    setStatus("error");
    setMessage(res.error ?? "Could not join group");
  }, [user?.id, user?.email, user?.name, token, code, joinInvite, fetchGroups]);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!token && !code) {
      setStatus("error");
      setMessage("Invalid invite link");
      return;
    }
    const key = token ? `token:${token}` : `code:${code}`;
    if (finishedKey.current === key) return;
    if (!isLoggedIn || !user?.id) {
      setStatus("login");
      return;
    }
    void runJoin();
  }, [hasInitialized, isLoggedIn, user?.id, token, code, runJoin]);

  const showLoader = status === "checking" || status === "joining";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.card}>
        {showLoader ? (
          <View style={styles.loader}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loaderText}>
              {status === "joining" ? "Joining group…" : "Checking invite…"}
            </Text>
          </View>
        ) : null}

        {status === "login" ? (
          <>
            <View style={styles.iconCircle}>
              <AppIcon name="users" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Log in to join</Text>
            <Text style={styles.body}>
              Sign in to your Finkoin account to join this group. New here?
              Create a free account — the group will be waiting.
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(auth)/login",
                  params: { next: joinPath },
                })
              }
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(auth)/signup",
                  params: { next: joinPath },
                })
              }
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>Create free account</Text>
            </Pressable>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <View style={styles.iconCircle}>
              <AppIcon name="check" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Joined “{groupName}”</Text>
            <Text style={styles.muted}>Taking you to the group…</Text>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <View style={styles.iconCircle}>
              <AppIcon name="users" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.titleSm}>Could not join group</Text>
            <Text style={styles.muted}>{message}</Text>
            {token || code ? (
              <Pressable
                onPress={() => {
                  finishedKey.current = null;
                  if (isLoggedIn) void runJoin();
                  else setStatus("login");
                }}
                style={styles.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Try again</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.replace("/(tabs)/split")}
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>Go to Split</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F4",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    padding: 32,
    alignItems: "center",
  },
  loader: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { fontSize: 14, color: "#5F5E5A" },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111110",
    textAlign: "center",
  },
  titleSm: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111110",
    textAlign: "center",
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5F5E5A",
    textAlign: "center",
  },
  muted: {
    marginTop: 8,
    fontSize: 14,
    color: "#9B9A94",
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 24,
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
