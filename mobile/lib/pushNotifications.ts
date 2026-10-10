/**
 * Native push for the app — mobile counterpart of web `lib/webPushClient.ts`.
 * Tokens live in `expo_push_tokens`; the server sends to them alongside Web Push
 * (daily tip, split expense) with `data.url` = the same deep link the PWA uses.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { Href } from "expo-router";
import { supabase } from "@/lib/supabase";
import { syncKv } from "@/lib/syncKv";
import { nativeRouteForPath } from "@/lib/contentLinks";

const ASKED_KEY = "finkoin_push_permission_asked";
const TOKEN_KEY = "finkoin_expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Finkoin",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#534AB7",
  });
}

export async function getPushPermission(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Show the OS Allow / Don't allow dialog once per install (storage is wiped on
 * uninstall, so a reinstall asks again). Returns true when granted.
 */
export async function askPushPermissionOnce(): Promise<boolean> {
  const current = await getPushPermission();
  if (current === "granted") return true;
  if (syncKv.getItem(ASKED_KEY)) return false;
  syncKv.setItem(ASKED_KEY, new Date().toISOString());
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Ask again (e.g. from Profile); false when the OS has blocked further prompts. */
export async function requestPushPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Save this device's Expo push token for the signed-in user (needs permission). */
export async function registerPushToken(userId: string): Promise<boolean> {
  try {
    if (!Device.isDevice) return false;
    if ((await getPushPermission()) !== "granted") return false;
    await ensureAndroidChannel();
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId(),
    });
    if (!token) return false;
    const now = new Date().toISOString();
    const { error } = await supabase.from("expo_push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        device_name: Device.deviceName ?? null,
        updated_at: now,
      },
      { onConflict: "user_id,token" },
    );
    if (error) {
      console.warn("expo_push_tokens upsert:", error.message);
      return false;
    }
    syncKv.setItem(TOKEN_KEY, token);
    await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        push_consent: true,
        push_consent_at: now,
        morning_tips: true,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    return true;
  } catch (e) {
    console.warn("registerPushToken", e);
    return false;
  }
}

/** Remove this device's token (call before sign-out so the next user doesn't get these pushes). */
export async function unregisterPushToken(userId: string): Promise<void> {
  const token = syncKv.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await supabase
      .from("expo_push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);
  } catch {
    /* best-effort */
  }
  syncKv.removeItem(TOKEN_KEY);
}

function queryParam(query: string, key: string): string | null {
  for (const part of query.split("&")) {
    const [k, v = ""] = part.split("=");
    if (decodeURIComponent(k ?? "") === key) {
      return decodeURIComponent(v.replace(/\+/g, " ")) || null;
    }
  }
  return null;
}

/** Map a PWA deep link from push `data.url` to an in-app route. */
export function routeForPushUrl(url: unknown): Href {
  const raw = typeof url === "string" ? url : "";
  const [path, query = ""] = raw.split("?");
  if (path === "/notifications" || path === "") {
    const id = queryParam(query, "id");
    return id
      ? { pathname: "/notifications", params: { id } }
      : "/notifications";
  }
  if (path === "/split/join") {
    const token = queryParam(query, "token");
    const code = queryParam(query, "code");
    if (token) return { pathname: "/split/join", params: { token } };
    if (code) return { pathname: "/split/join", params: { code } };
    return "/(tabs)/split";
  }
  const split = /^\/split\/([^/]+)$/.exec(path);
  if (split) {
    const notif = queryParam(query, "notif");
    return {
      pathname: "/split/[groupId]",
      params: notif
        ? { groupId: split[1], notif }
        : { groupId: split[1] },
    };
  }
  if (path.startsWith("/tracker")) return "/(tabs)/tracker";
  const native = nativeRouteForPath(raw);
  return native === "/(tabs)" ? "/notifications" : (native as Href);
}
