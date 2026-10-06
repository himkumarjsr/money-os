/**
 * Root-level push wiring: OS permission on first launch (any user, signed in or
 * not), token registration once signed in, inbox refresh on receipt, and
 * deep-link routing when a notification is tapped (warm or cold start).
 */
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import {
  askPushPermissionOnce,
  ensureAndroidChannel,
  registerPushToken,
  routeForPushUrl,
} from "@/lib/pushNotifications";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

// getLastNotificationResponseAsync can return the same tap on later launches.
const LAST_HANDLED_KEY = "finkoin_last_push_handled";

export function PushNotificationsManager() {
  const userId = useAuthStore((s) => (s.isLoggedIn ? s.user?.id : undefined));
  const permissionChecked = useRef(false);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      await hydrateSyncKv();
      await ensureAndroidChannel();
      const granted = await askPushPermissionOnce();
      permissionChecked.current = true;
      if (cancelled || !granted) return;
      const uid = useAuthStore.getState().user?.id;
      if (useAuthStore.getState().isLoggedIn && uid) {
        void registerPushToken(uid);
      }
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!userId || !permissionChecked.current) return;
    void registerPushToken(userId);
  }, [userId]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id) || syncKv.getItem(LAST_HANDLED_KEY) === id) {
        return;
      }
      handled.current.add(id);
      syncKv.setItem(LAST_HANDLED_KEY, id);
      const url = response.notification.request.content.data?.url;
      router.push(routeForPushUrl(url));
    };

    const received = Notifications.addNotificationReceivedListener(() => {
      const uid = useAuthStore.getState().user?.id;
      if (uid) void useNotificationStore.getState().fetchNotifications(uid);
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(open);

    const coldStart = setTimeout(async () => {
      await hydrateSyncKv();
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) open(last);
    }, 600);

    return () => {
      received.remove();
      tapped.remove();
      clearTimeout(coldStart);
    };
  }, []);

  return null;
}
